import type { IAlert } from '../models/Alert';
import type { IAuditLog } from '../models/AuditLog';
import type { IDonation } from '../models/Donation';
import type { IEmergency } from '../models/Emergency';
import type { IMission } from '../models/Mission';
import type { INotification } from '../models/Notification';
import type { IReliefCamp } from '../models/ReliefCamp';
import type { IResource } from '../models/Resource';
import type { IUser } from '../models/User';
import type { IVolunteerTask } from '../models/VolunteerTask';
import { maskPhone } from '../utils/text';

export type Audience = 'public' | 'staff' | 'owner';

function iso(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function refId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function geo(point?: { coordinates: [number, number] } | null) {
  if (!point?.coordinates) return undefined;
  return { lat: point.coordinates[1], lng: point.coordinates[0] };
}

export function serializeUser(user: IUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    organization: user.organization,
    isActive: user.isActive,
    responderProfile: user.responderProfile
      ? {
          team: user.responderProfile.team,
          vehicleType: user.responderProfile.vehicleType,
          status: user.responderProfile.status,
          location: geo(user.responderProfile.currentLocation),
          equipment: user.responderProfile.equipment,
        }
      : undefined,
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
  };
}

export function serializeEmergency(emergency: IEmergency, audience: Audience = 'public') {
  const canSeeContact = audience === 'staff' || audience === 'owner';
  return {
    id: emergency.id,
    ticketId: emergency.ticketId,
    title: emergency.title,
    description: emergency.description,
    category: emergency.category,
    location: {
      ...geo(emergency.location),
      address: emergency.address,
      landmark: emergency.landmark,
    },
    urgency: emergency.urgency,
    status: emergency.status,
    verificationStatus: emergency.verificationStatus,
    trustScore: emergency.trustScore,
    corroboratingReportCount: emergency.corroboratingReportCount,
    peopleCount: emergency.peopleCount,
    isAnonymous: emergency.isAnonymous,
    isForOther: emergency.isForOther,
    affectedPersonName: canSeeContact ? emergency.affectedPersonName : undefined,
    reporterName: canSeeContact ? emergency.reporterName : undefined,
    reporterPhone: canSeeContact ? emergency.reporterPhone : undefined,
    trustSignals: canSeeContact ? emergency.trustSignals : undefined,
    mediaUrl: emergency.media?.url ?? emergency.mediaUrl,
    voiceMemoUrl: emergency.voiceMemoUrl,
    voiceMemoDuration: emergency.voiceMemoDuration,
    aiAssessment: canSeeContact && emergency.aiAssessment
      ? {
          category: emergency.aiAssessment.category,
          suggestedUrgency: emergency.aiAssessment.suggestedUrgency,
          possibleHazards: emergency.aiAssessment.possibleHazards,
          suggestedResources: emergency.aiAssessment.suggestedResources,
          reasoningSummary: emergency.aiAssessment.reasoningSummary,
          requiresHumanReview: emergency.aiAssessment.requiresHumanReview,
          imageAuthenticityConfidence: emergency.aiAssessment.imageAuthenticityConfidence,
          peopleCountEstimate: emergency.aiAssessment.peopleCountEstimate,
          model: emergency.aiAssessment.model,
          analyzedAt: iso(emergency.aiAssessment.analyzedAt),
        }
      : null,
    assignedResponderId: refId(emergency.assignedResponder),
    assignedResponderName: emergency.assignedResponderName,
    assignedAt: iso(emergency.assignedAt),
    missionId: refId(emergency.assignedMission),
    resolvedAt: iso(emergency.resolvedAt),
    reportedAt: iso(emergency.createdAt),
    createdAt: iso(emergency.createdAt),
    updatedAt: iso(emergency.updatedAt),
  };
}

export function serializeResponder(
  user: IUser,
  options: { audience?: Audience; activeMissionId?: string } = {},
) {
  const staff = options.audience === 'staff';
  const location = geo(user.responderProfile?.currentLocation);
  if (!location) return null;

  return {
    id: user.id,
    name: user.name,
    team: user.responderProfile?.team ?? 'Relief Response Unit',
    vehicleType: user.responderProfile?.vehicleType ?? 'RAPID_BIKE',
    status: user.responderProfile?.status ?? 'AVAILABLE',
    phone: staff ? user.phone : maskPhone(user.phone),
    location,
    activeMissionId: options.activeMissionId,
    equipment: user.responderProfile?.equipment ?? [],
    isActive: user.isActive,
  };
}

export function serializeMission(mission: IMission) {
  return {
    id: mission.id,
    emergencyId: refId(mission.emergency),
    responderId: refId(mission.responder),
    status: mission.status,
    notes: mission.notes,
    acceptedAt: iso(mission.acceptedAt),
    enRouteAt: iso(mission.enRouteAt),
    arrivedAt: iso(mission.arrivedAt),
    completedAt: iso(mission.completedAt),
    cancelledAt: iso(mission.cancelledAt),
    createdAt: iso(mission.createdAt),
    updatedAt: iso(mission.updatedAt),
  };
}

export function serializeResource(resource: IResource) {
  return {
    id: resource.id,
    name: resource.name,
    category: resource.category,
    quantity: resource.quantity,
    availableQuantity: resource.availableQuantity,
    unit: resource.unit,
    organizationName: resource.organizationName,
    warehouseName: resource.warehouseName,
    location: geo(resource.location),
    status: resource.status,
    criticalThreshold: resource.criticalThreshold,
    ownerId: refId(resource.owner),
    lastUpdated: iso(resource.updatedAt),
    createdAt: iso(resource.createdAt),
    updatedAt: iso(resource.updatedAt),
  };
}

export function serializeCamp(camp: IReliefCamp, audience: Audience = 'public') {
  return {
    id: camp.id,
    name: camp.name,
    location: geo(camp.location),
    address: camp.address,
    capacity: camp.capacity,
    currentOccupancy: camp.currentOccupancy,
    availableBeds: Math.max(0, camp.capacity - camp.currentOccupancy),
    availableServices: camp.availableServices,
    status: camp.status,
    contactPerson: camp.contactPerson,
    contactPhone: audience === 'staff' ? camp.contactPhone : maskPhone(camp.contactPhone),
    suppliesStatus: camp.suppliesStatus,
    hasMedicalPost: camp.hasMedicalPost,
    hasDrinkingWater: camp.hasDrinkingWater,
    hasPowerBackup: camp.hasPowerBackup,
    createdAt: iso(camp.createdAt),
    updatedAt: iso(camp.updatedAt),
  };
}

export function serializeDonation(donation: IDonation, audience: Audience = 'public', token?: string) {
  const canSeePrivate = audience === 'staff' || audience === 'owner';
  return {
    id: donation.id,
    trackingId: donation.trackingId,
    trackingToken: token,
    donorName: donation.donorName,
    donorEmail: canSeePrivate ? donation.donorEmail : undefined,
    donationType: donation.donationType,
    itemDescription: donation.itemDescription,
    amountOrQuantity: donation.amountOrQuantity,
    quantity: donation.quantity,
    destination: donation.destination,
    allocatedCampId: refId(donation.allocatedCamp),
    allocatedCampName: donation.allocatedCampName,
    status: donation.status,
    currentLocation: donation.currentLocation,
    trackingEvents: donation.trackingEvents.map((event) => ({
      status: event.status,
      location: event.location,
      notes: event.notes,
      verifiedByName: event.verifiedByName,
      at: iso(event.at),
      verifiedBy: refId(event.verifiedBy),
    })),
    createdAt: iso(donation.createdAt),
    updatedAt: iso(donation.updatedAt),
  };
}

export function serializeTask(task: IVolunteerTask, userId?: string) {
  const assignedCount = task.assignedVolunteers.length;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    urgency: task.urgency,
    location: geo(task.location),
    locationName: task.locationName,
    requiredVolunteers: task.requiredVolunteers,
    assignedVolunteersCount: assignedCount,
    isJoined: userId ? task.assignedVolunteers.some((item) => item.volunteer.toString() === userId) : undefined,
    status: task.status,
    timeEstimate: task.timeEstimate,
    createdAt: iso(task.createdAt),
    updatedAt: iso(task.updatedAt),
  };
}

export function serializeNotification(notification: INotification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedEntity: notification.relatedEntity,
    readAt: iso(notification.readAt),
    createdAt: iso(notification.createdAt),
  };
}

export function serializeAlert(alert: IAlert) {
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    affectedZones: alert.affectedZones,
    issuedAt: iso(alert.issuedAt),
    expiresAt: iso(alert.expiresAt),
    isActive: alert.isActive,
    createdAt: iso(alert.createdAt),
  };
}

export function serializeAuditLog(log: IAuditLog) {
  return {
    id: log.id,
    timestamp: iso(log.createdAt),
    actorName: log.actorName,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    details: log.details,
    ipAddress: log.ipAddress,
  };
}

export function serializeUpload(file: Express.Multer.File) {
  return {
    url: `/uploads/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    kind: file.mimetype.startsWith('image/') ? 'image' : 'audio',
  };
}
