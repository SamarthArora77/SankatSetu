import { Types } from 'mongoose';
import { Emergency, type IEmergency } from '../models/Emergency';
import { Mission, type IMission } from '../models/Mission';
import { User, type IUser } from '../models/User';
import { ACTIVE_MISSION_STATUSES, MISSION_TRANSITIONS, type MissionStatus, type Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './audit.service';
import { notifyUser } from './notification.service';
import { emitToPublic, emitToRole, emitToUser } from './socket.service';
import { serializeEmergency, serializeMission } from '../serializers';
import type { AssignMissionInput, MissionStatusUpdateInput } from '../schemas/mission.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

async function findResponder(responderId: string): Promise<IUser> {
  const responder = await User.findById(responderId);
  if (!responder) throw ApiError.notFound('Responder not found.', 'RESPONDER_NOT_FOUND');
  if (responder.role !== 'RESPONDER') {
    throw ApiError.badRequest('The selected user is not a responder.', 'NOT_A_RESPONDER');
  }
  if (!responder.isActive) {
    throw ApiError.conflict('This responder account is deactivated.', 'RESPONDER_INACTIVE');
  }
  if (!responder.responderProfile) {
    throw ApiError.conflict('This responder has no responder profile.', 'RESPONDER_PROFILE_MISSING');
  }
  return responder;
}

async function beginAssignment(
  emergencyId: string,
  responder: IUser,
  notes: string | undefined,
  mode: 'ASSIGN' | 'CLAIM',
) {
  const previousStatus = responder.responderProfile?.status ?? 'AVAILABLE';
  const allowedStatuses = mode === 'CLAIM' ? ['AVAILABLE'] : ['AVAILABLE', 'OFF_DUTY'];

  const responderClaim = await User.findOneAndUpdate(
    {
      _id: responder.id,
      role: 'RESPONDER',
      isActive: true,
      'responderProfile.status': { $in: allowedStatuses },
    },
    { $set: { 'responderProfile.status': 'DISPATCHED' } },
    { new: true },
  );

  if (!responderClaim) {
    const fresh = await User.findById(responder.id);
    if (!fresh) throw ApiError.notFound('Responder not found.', 'RESPONDER_NOT_FOUND');
    if (!fresh.isActive) throw ApiError.conflict('This responder account is deactivated.', 'RESPONDER_INACTIVE');
    if (fresh.responderProfile?.status === 'OFF_DUTY' && mode === 'CLAIM') {
      throw ApiError.conflict('Set yourself as AVAILABLE before claiming a mission.', 'RESPONDER_OFF_DUTY');
    }
    throw ApiError.conflict(
      'This responder is already deployed or on scene.',
      'RESPONDER_UNAVAILABLE',
    );
  }

  const missionId = new Types.ObjectId();
  const now = new Date();
  const claimedEmergency = await Emergency.findOneAndUpdate(
    { _id: emergencyId, status: 'VERIFIED', assignedMission: { $exists: false } },
    {
      $set: {
        status: 'ASSIGNED',
        assignedResponder: responder.id,
        assignedResponderName: responder.name,
        assignedAt: now,
        assignedMission: missionId,
      },
    },
    { new: true },
  );

  if (!claimedEmergency) {
    await User.updateOne(
      { _id: responder.id, 'responderProfile.status': 'DISPATCHED' },
      { $set: { 'responderProfile.status': previousStatus } },
    );
    const existing = await Emergency.findById(emergencyId);
    if (!existing) throw ApiError.notFound('Emergency report not found.', 'EMERGENCY_NOT_FOUND');
    if (existing.assignedMission || existing.assignedResponder) {
      throw ApiError.conflict('This emergency is already assigned.', 'EMERGENCY_ALREADY_ASSIGNED');
    }
    if (existing.status !== 'VERIFIED') {
      throw ApiError.conflict(
        'Emergency must be verified before it can be assigned.',
        'EMERGENCY_NOT_VERIFIED',
      );
    }
    throw ApiError.conflict('This emergency is already assigned.', 'EMERGENCY_ALREADY_ASSIGNED');
  }

  try {
    const mission = await Mission.create({
      _id: missionId,
      emergency: emergencyId,
      responder: responder.id,
      status: 'ASSIGNED',
      notes,
      acceptedAt: now,
    });
    return { mission, emergency: claimedEmergency };
  } catch (error) {
    await Emergency.updateOne(
      { _id: emergencyId, assignedMission: missionId },
      {
        $set: { status: 'VERIFIED' },
        $unset: {
          assignedMission: '',
          assignedResponder: '',
          assignedResponderName: '',
          assignedAt: '',
        },
      },
    );
    await User.updateOne(
      { _id: responder.id },
      { $set: { 'responderProfile.status': previousStatus } },
    );
    throw error;
  }
}

async function announceAssignment(
  mission: IMission,
  emergency: IEmergency,
  responder: IUser,
  actor: Actor,
  action: 'MISSION_ASSIGNED' | 'MISSION_CLAIMED',
) {
  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action,
    targetType: 'Mission',
    targetId: mission.id,
    details: `Emergency ${emergency.ticketId} assigned to ${responder.name}.`,
    ip: actor.ip,
  });

  void notifyUser(responder.id, {
    type: 'MISSION_UPDATE',
    title: `Mission assigned: ${emergency.ticketId}`,
    message: `${emergency.title} at ${emergency.address ?? 'GPS location'}.`,
    relatedEntity: { type: 'Mission', id: mission.id },
  }).catch((error) => console.warn('[notify] Could not notify responder:', error instanceof Error ? error.message : error));

  if (emergency.reportedBy) {
    void notifyUser(emergency.reportedBy, {
      type: 'EMERGENCY_UPDATE',
      title: `Rescue unit assigned to ${emergency.ticketId}`,
      message: `${responder.name} has been assigned to your report.`,
      relatedEntity: { type: 'Emergency', id: emergency.id },
    }).catch((error) => console.warn('[notify] Could not notify reporter:', error instanceof Error ? error.message : error));
  }

  emitToPublic('emergency:updated', serializeEmergency(emergency, 'public'));
  emitToRole('ADMIN', 'mission:created', serializeMission(mission));
  emitToUser(responder.id, 'mission:created', serializeMission(mission));
}

export async function assignMission(input: AssignMissionInput, actor: Actor) {
  const responder = await findResponder(input.responderId);

  const activeMission = await Mission.exists({
    responder: responder.id,
    status: { $in: ACTIVE_MISSION_STATUSES },
  });
  if (activeMission) {
    throw ApiError.conflict('This responder already has an active mission.', 'RESPONDER_UNAVAILABLE');
  }

  const { mission, emergency } = await beginAssignment(input.emergencyId, responder, input.notes, 'ASSIGN');
  await announceAssignment(mission, emergency, responder, actor, 'MISSION_ASSIGNED');
  return mission;
}

export async function claimMission(emergencyId: string, actor: Actor) {
  const responder = await findResponder(actor.id);

  const activeMission = await Mission.exists({
    responder: responder.id,
    status: { $in: ACTIVE_MISSION_STATUSES },
  });
  if (activeMission) {
    throw ApiError.conflict('You already have an active mission.', 'RESPONDER_UNAVAILABLE');
  }

  const { mission, emergency } = await beginAssignment(emergencyId, responder, undefined, 'CLAIM');
  await announceAssignment(mission, emergency, responder, actor, 'MISSION_CLAIMED');
  return mission;
}

export async function getMissionById(missionId: string): Promise<IMission> {
  const mission = await Mission.findById(missionId);
  if (!mission) throw ApiError.notFound('Mission not found.', 'MISSION_NOT_FOUND');
  return mission;
}

export async function updateMissionStatus(missionId: string, input: MissionStatusUpdateInput, actor: Actor) {
  const mission = await getMissionById(missionId);

  if (actor.role !== 'ADMIN' && String(mission.responder) !== actor.id) {
    throw ApiError.forbidden('Only the assigned responder or an administrator can update this mission.');
  }

  const allowed = MISSION_TRANSITIONS[mission.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.conflict(
      `Cannot move mission from ${mission.status} to ${input.status}.`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const now = new Date();
  mission.status = input.status;
  if (input.notes) mission.notes = input.notes;
  if (input.status === 'EN_ROUTE') mission.enRouteAt = now;
  if (input.status === 'ARRIVED') mission.arrivedAt = now;
  if (input.status === 'COMPLETED') mission.completedAt = now;
  if (input.status === 'CANCELLED') mission.cancelledAt = now;
  await mission.save();

  const emergency = await Emergency.findById(mission.emergency);
  if (emergency) {
    if (input.status === 'ARRIVED' && emergency.status === 'ASSIGNED') {
      emergency.status = 'IN_PROGRESS';
    } else if (input.status === 'COMPLETED') {
      emergency.status = 'RESOLVED';
      emergency.resolvedAt = now;
    } else if (input.status === 'CANCELLED') {
      emergency.status = 'VERIFIED';
      emergency.assignedMission = undefined;
      emergency.assignedResponder = undefined;
      emergency.assignedResponderName = undefined;
      emergency.assignedAt = undefined;
    }
    await emergency.save();
  }

  const responderStatus: Record<string, 'DISPATCHED' | 'ON_SCENE' | 'AVAILABLE'> = {
    EN_ROUTE: 'DISPATCHED',
    ARRIVED: 'ON_SCENE',
    COMPLETED: 'AVAILABLE',
    CANCELLED: 'AVAILABLE',
  };
  const nextResponderStatus = responderStatus[input.status];
  const responderUpdate: Record<string, unknown> = {};
  if (nextResponderStatus) responderUpdate['responderProfile.status'] = nextResponderStatus;
  if (input.location) {
    responderUpdate['responderProfile.currentLocation'] = {
      type: 'Point',
      coordinates: [input.location.lng, input.location.lat],
    };
  }
  if (Object.keys(responderUpdate).length > 0) {
    await User.updateOne({ _id: mission.responder }, { $set: responderUpdate });
  }

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'MISSION_STATUS_CHANGED',
    targetType: 'Mission',
    targetId: mission.id,
    details: `Mission moved to ${input.status}.${input.notes ? ` Note: ${input.notes}` : ''}`,
    ip: actor.ip,
  });

  emitToRole('ADMIN', 'mission:updated', serializeMission(mission));
  emitToUser(mission.responder.toString(), 'mission:updated', serializeMission(mission));

  if (emergency) {
    emitToPublic('emergency:updated', serializeEmergency(emergency, 'public'));
    emitToRole('ADMIN', 'emergency:updated', serializeEmergency(emergency, 'staff'));
    if (emergency.reportedBy) {
      void notifyUser(emergency.reportedBy, {
        type: 'EMERGENCY_UPDATE',
        title: `Mission update for ${emergency.ticketId}`,
        message: `Your rescue mission is now ${input.status.replace('_', ' ')}.`,
        relatedEntity: { type: 'Emergency', id: emergency.id },
      }).catch((error) => console.warn('[notify] Could not notify reporter:', error instanceof Error ? error.message : error));
    }
  }

  return mission;
}

export async function listMissions(
  filter: { responder?: string; status?: MissionStatus },
  page: number,
  limit: number,
) {
  const query: Record<string, unknown> = {};
  if (filter.responder) query.responder = filter.responder;
  if (filter.status) query.status = filter.status;

  const [missions, total] = await Promise.all([
    Mission.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Mission.countDocuments(query),
  ]);

  return { missions, total };
}

export async function getEmergenciesForMissions(missions: IMission[]) {
  const ids = missions.map((mission) => mission.emergency);
  const emergencies = await Emergency.find({ _id: { $in: ids } });
  return new Map(emergencies.map((emergency) => [emergency.id, emergency]));
}

export async function getActiveMissionIdForResponder(responderId: string): Promise<string | undefined> {
  const mission = await Mission.findOne({
    responder: responderId,
    status: { $in: ACTIVE_MISSION_STATUSES },
  }).sort({ createdAt: -1 });
  return mission?.id;
}
