import type { FilterQuery } from 'mongoose';
import { Emergency, type IEmergency } from '../models/Emergency';
import {
  ACTIVE_EMERGENCY_STATUSES,
  EMERGENCY_TRANSITIONS,
  type EmergencyStatus,
  type Role,
} from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { generateTicketId, generateTrackingToken } from '../utils/ids';
import { sha256, safeEqual } from '../utils/crypto';
import { escapeRegex } from '../utils/text';
import { serializeEmergency } from '../serializers';
import { recordAudit } from './audit.service';
import { notifyRole, notifyUser } from './notification.service';
import { emitToPublic, emitToRole } from './socket.service';
import { analyzeEmergencyReport } from './ai.service';
import { invalidatePublicCache } from './cache.service';
import type {
  CreateEmergencyInput,
  EmergencyStatusUpdateInput,
  EmergencyVerificationInput,
  ListEmergencyQuery,
} from '../schemas/emergency.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

interface CreateOptions {
  user?: { id: string; name: string };
  ip?: string;
}

const STAFF_ROLES: Role[] = ['ADMIN', 'RESPONDER', 'NGO'];

function isStaff(role?: Role): boolean {
  return Boolean(role && STAFF_ROLES.includes(role));
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

function centerSphere(lat: number, lng: number, radiusKm: number) {
  return [[lng, lat], radiusKm / 6378.1];
}

async function countNearbyReports(input: CreateEmergencyInput): Promise<number> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return Emergency.countDocuments({
    status: { $in: ACTIVE_EMERGENCY_STATUSES },
    category: { $in: input.category },
    createdAt: { $gte: since },
    location: {
      $geoWithin: {
        $centerSphere: centerSphere(input.location.lat, input.location.lng, 0.5),
      },
    },
  });
}

export function hasTrackingAccess(
  emergency: IEmergency,
  user: { id: string; role: Role } | undefined,
  token?: string,
): boolean {
  if (user) {
    if (isStaff(user.role)) return true;
    if (emergency.reportedBy && String(emergency.reportedBy) === user.id) return true;
  }
  if (!token || token.length < 16) return false;
  return safeEqual(token, emergency.trackingTokenHash);
}

export async function createEmergency(input: CreateEmergencyInput, options: CreateOptions) {
  const trackingToken = generateTrackingToken();
  const corroboratingReportCount = await countNearbyReports(input).catch(() => 0);

  const trustSignals: string[] = [];
  let trustScore = 0;

  if (options.user) {
    trustScore += 10;
    trustSignals.push('Submitted from an authenticated account');
  }
  if (input.reporterPhone) {
    trustScore += 5;
    trustSignals.push('Callback phone number supplied');
  }
  if (input.mediaUrl) {
    trustScore += 10;
    trustSignals.push('Photo or voice evidence attached');
  }
  if (input.description.length >= 120) {
    trustScore += 5;
    trustSignals.push('Detailed free-text description supplied');
  }
  if (corroboratingReportCount > 0) {
    trustScore += Math.min(30, corroboratingReportCount * 15);
    trustSignals.push(
      `${corroboratingReportCount} similar report(s) within 500m in the last 2 hours`,
    );
  }

  let emergency: IEmergency | null = null;
  for (let attempt = 0; attempt < 5 && !emergency; attempt += 1) {
    try {
      emergency = await Emergency.create({
        ticketId: generateTicketId(),
        title: input.title,
        description: input.description,
        category: input.category,
        location: {
          type: 'Point',
          coordinates: [input.location.lng, input.location.lat],
        },
        address: input.location.address,
        landmark: input.location.landmark,
        urgency: input.urgency,
        status: 'PENDING',
        peopleCount: input.peopleCount,
        isAnonymous: input.isAnonymous,
        isForOther: input.isForOther,
        affectedPersonName: input.affectedPersonName,
        reporterName: input.reporterName,
        reporterPhone: input.reporterPhone,
        reportedBy: options.user?.id,
        mediaUrl: input.mediaUrl,
        voiceMemoUrl: input.voiceMemoUrl,
        voiceMemoDuration: input.voiceMemoDuration,
        verificationStatus: 'UNVERIFIED',
        trustScore,
        trustSignals,
        corroboratingReportCount,
        trackingTokenHash: sha256(trackingToken),
        submissionIpHash: options.ip ? sha256(options.ip) : undefined,
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  if (!emergency) {
    throw ApiError.serviceUnavailable(
      'Could not allocate a unique ticket. Please retry.',
      'TICKET_ALLOCATION_FAILED',
    );
  }

  await recordAudit({
    actor: options.user,
    actorName: options.user?.name ?? (input.isAnonymous ? 'Anonymous reporter' : input.reporterName ?? 'Public reporter'),
    action: 'EMERGENCY_REPORTED',
    targetType: 'Emergency',
    targetId: emergency.ticketId,
    details: `Reported ${input.urgency} ${input.category.join(', ')} incident at ${input.location.address ?? 'GPS location'}. Trust score ${trustScore}.`,
    ip: options.ip,
  });

  emitToPublic('emergency:created', serializeEmergency(emergency, 'public'));
  await invalidatePublicCache();

  if (input.urgency === 'CRITICAL') {
    void notifyRole('ADMIN', {
      type: 'EMERGENCY_UPDATE',
      title: `New CRITICAL SOS ${emergency.ticketId}`,
      message: input.title,
      relatedEntity: { type: 'Emergency', id: emergency.id },
    }).catch((error) => console.warn('[notify] Could not alert admins:', error instanceof Error ? error.message : error));
  }

  return { emergency, trackingToken };
}

export function audienceFor(emergency: IEmergency, user?: { id: string; role: Role }) {
  if (!user) return 'public' as const;
  if (isStaff(user.role)) return 'staff' as const;
  if (emergency.reportedBy && String(emergency.reportedBy) === user.id) return 'owner' as const;
  return 'public' as const;
}

export async function listEmergencies(
  query: ListEmergencyQuery,
  audience: 'public' | 'staff' | 'owner',
  user?: { id: string },
) {
  const filter: FilterQuery<IEmergency> = {};

  if (query.status) {
    filter.status = query.status;
  } else if (audience === 'public') {
    filter.status = { $ne: 'REJECTED' };
  }

  if (query.urgency) filter.urgency = query.urgency;
  if (query.category) filter.category = query.category;
  if (query.mine) {
    if (!user) throw ApiError.unauthorized('Sign in to view your reports.');
    filter.reportedBy = user.id;
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { address: pattern }, { ticketId: pattern }];
  }
  if (query.lat !== undefined && query.lng !== undefined && query.radiusKm) {
    filter.location = {
      $geoWithin: { $centerSphere: centerSphere(query.lat, query.lng, query.radiusKm) },
    };
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { createdAt: query.sort === 'oldest' ? 1 : -1 };

  const [emergencies, total] = await Promise.all([
    Emergency.find(filter).sort(sort).skip(skip).limit(limit),
    Emergency.countDocuments(filter),
  ]);

  return { emergencies, total, page, limit };
}

export async function getEmergencyById(id: string): Promise<IEmergency> {
  const emergency = await Emergency.findById(id);
  if (!emergency) throw ApiError.notFound('Emergency report not found.', 'EMERGENCY_NOT_FOUND');
  return emergency;
}

export async function getEmergencyByTicket(ticketId: string): Promise<IEmergency> {
  const emergency = await Emergency.findOne({ ticketId }).select('+trackingTokenHash');
  if (!emergency) throw ApiError.notFound('No report matches that ticket.', 'EMERGENCY_NOT_FOUND');
  return emergency;
}

export async function listNearbyEmergencies(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
  category?: string,
) {
  const filter: FilterQuery<IEmergency> = {
    status: { $in: ACTIVE_EMERGENCY_STATUSES },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  };
  if (category) filter.category = category;

  return Emergency.find(filter).limit(limit);
}

export async function updateEmergencyStatus(
  id: string,
  input: EmergencyStatusUpdateInput,
  actor: Actor,
): Promise<IEmergency> {
  const emergency = await getEmergencyById(id);

  if (actor.role !== 'ADMIN') {
    if (actor.role !== 'RESPONDER') {
      throw ApiError.forbidden('Only the assigned responder or an administrator can update this emergency.');
    }
    if (!emergency.assignedResponder || String(emergency.assignedResponder) !== actor.id) {
      throw ApiError.forbidden('Responders can only update emergencies assigned to them.', 'NOT_ASSIGNED');
    }
    if (input.status === 'VERIFIED' || input.status === 'REJECTED') {
      throw ApiError.forbidden('Only administrators can verify or reject emergency reports.', 'ADMIN_ONLY');
    }
  }

  const allowed = EMERGENCY_TRANSITIONS[emergency.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.conflict(
      `Cannot move an emergency from ${emergency.status} to ${input.status}.`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  emergency.status = input.status;
  if (input.status === 'RESOLVED') {
    emergency.resolvedAt = new Date();
  }
  await emergency.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'EMERGENCY_STATUS_CHANGED',
    targetType: 'Emergency',
    targetId: emergency.ticketId,
    details: `Status changed to ${input.status}.${input.note ? ` Note: ${input.note}` : ''}`,
    ip: actor.ip,
  });

  if (emergency.reportedBy) {
    void notifyUser(emergency.reportedBy, {
      type: 'EMERGENCY_UPDATE',
      title: `Update on ${emergency.ticketId}`,
      message: `Your report is now ${input.status.replace('_', ' ')}.`,
      relatedEntity: { type: 'Emergency', id: emergency.id },
    }).catch((error) => console.warn('[notify] Could not notify reporter:', error instanceof Error ? error.message : error));
  }

  emitToPublic('emergency:updated', serializeEmergency(emergency, 'public'));
  emitToRole('ADMIN', 'emergency:updated', serializeEmergency(emergency, 'staff'));
  await invalidatePublicCache();

  return emergency;
}

export async function verifyEmergency(
  id: string,
  input: EmergencyVerificationInput,
  actor: Actor,
): Promise<IEmergency> {
  const emergency = await getEmergencyById(id);

  emergency.verificationStatus = input.verificationStatus;
  if (input.trustScore !== undefined) {
    emergency.trustScore = input.trustScore;
  }

  if (input.verificationStatus === 'VERIFIED') {
    if (emergency.status === 'PENDING') emergency.status = 'VERIFIED';
    emergency.trustSignals.push(`Human verification approved by ${actor.name}`);
  } else if (input.verificationStatus === 'REJECTED') {
    emergency.status = 'REJECTED';
    emergency.trustSignals.push(`Report rejected during human verification by ${actor.name}`);
  } else {
    emergency.trustSignals.push(`Marked for additional human review by ${actor.name}`);
  }

  await emergency.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'EMERGENCY_VERIFICATION_UPDATED',
    targetType: 'Emergency',
    targetId: emergency.ticketId,
    details: `Verification set to ${input.verificationStatus}.${input.notes ? ` Notes: ${input.notes}` : ''}`,
    ip: actor.ip,
  });

  if (emergency.reportedBy) {
    void notifyUser(emergency.reportedBy, {
      type: 'EMERGENCY_UPDATE',
      title: `Verification update on ${emergency.ticketId}`,
      message:
        input.verificationStatus === 'VERIFIED'
          ? 'Your emergency report has been verified by the emergency operations centre.'
          : input.verificationStatus === 'REJECTED'
            ? 'Your emergency report could not be verified. If this is still an emergency, call local emergency services.'
            : 'Your emergency report needs additional review.',
      relatedEntity: { type: 'Emergency', id: emergency.id },
    }).catch((error) => console.warn('[notify] Could not notify reporter:', error instanceof Error ? error.message : error));
  }

  if (input.verificationStatus === 'VERIFIED' && emergency.status === 'VERIFIED') {
    void notifyRole('RESPONDER', {
      type: 'EMERGENCY_UPDATE',
      title: `Verified emergency ${emergency.ticketId}`,
      message: `${emergency.title} — awaiting responder assignment.`,
      relatedEntity: { type: 'Emergency', id: emergency.id },
    }).catch((error) => console.warn('[notify] Could not alert responders:', error instanceof Error ? error.message : error));
  }

  emitToPublic('emergency:updated', serializeEmergency(emergency, 'public'));
  emitToRole('ADMIN', 'emergency:updated', serializeEmergency(emergency, 'staff'));
  await invalidatePublicCache();

  return emergency;
}

export async function analyzeEmergency(id: string, actor: Actor): Promise<IEmergency> {
  const emergency = await getEmergencyById(id);
  const assessment = await analyzeEmergencyReport(emergency);

  emergency.aiAssessment = assessment;
  await emergency.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'EMERGENCY_AI_ANALYZED',
    targetType: 'Emergency',
    targetId: emergency.ticketId,
    details: `AI assessment generated with ${assessment.model}; human review remains required.`,
    ip: actor.ip,
  });

  emitToRole('ADMIN', 'emergency:analyzed', serializeEmergency(emergency, 'staff'));
  emitToRole('RESPONDER', 'emergency:analyzed', serializeEmergency(emergency, 'staff'));

  return emergency;
}

export function assertStatusNotRejected(status: EmergencyStatus): void {
  if (status === 'REJECTED') {
    throw ApiError.conflict('This emergency report has been rejected.', 'EMERGENCY_REJECTED');
  }
}
