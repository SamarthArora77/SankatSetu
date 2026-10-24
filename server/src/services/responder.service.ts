import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../models/User';
import { Mission } from '../models/Mission';
import { ACTIVE_MISSION_STATUSES, type Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { recordAudit } from './audit.service';
import { emitToPublic, emitToRole } from './socket.service';
import { serializeResponder } from '../serializers';
import { getActiveMissionIdForResponder } from './mission.service';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

export async function listResponders(
  filter: { status?: string; page: number; limit: number },
  audience: 'public' | 'staff' = 'public',
) {
  const query: FilterQuery<IUser> = {
    role: 'RESPONDER',
    isActive: true,
    'responderProfile.currentLocation': { $exists: true },
  };
  if (filter.status) query['responderProfile.status'] = filter.status;

  const [responders, total] = await Promise.all([
    User.find(query)
      .sort({ name: 1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit),
    User.countDocuments(query),
  ]);

  const missions = await Mission.find({
    responder: { $in: responders.map((responder) => responder.id) },
    status: { $in: ACTIVE_MISSION_STATUSES },
  });
  const missionByResponder = new Map(missions.map((mission) => [mission.responder.toString(), mission.id]));

  return {
    responders: responders
      .map((responder) =>
        serializeResponder(responder, {
          audience,
          activeMissionId: audience === 'staff' ? missionByResponder.get(responder.id) : undefined,
        }),
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    total,
  };
}

export async function listNearbyResponders(lat: number, lng: number, radiusKm: number, limit: number) {
  const responders = await User.find({
    role: 'RESPONDER',
    isActive: true,
    'responderProfile.currentLocation': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(limit);

  return responders
    .map((responder) => serializeResponder(responder, { audience: 'public' }))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function getResponder(responderId: string, audience: 'public' | 'staff') {
  const responder = await User.findOne({ _id: responderId, role: 'RESPONDER' });
  if (!responder) throw ApiError.notFound('Responder not found.', 'RESPONDER_NOT_FOUND');
  const activeMissionId = await getActiveMissionIdForResponder(responder.id);
  const serialized = serializeResponder(responder, { audience, activeMissionId });
  if (!serialized) {
    throw ApiError.conflict('This responder has not shared a location yet.', 'RESPONDER_LOCATION_MISSING');
  }
  return serialized;
}

export async function updateResponderLocation(
  actor: Actor,
  location: { lat: number; lng: number },
) {
  const responder = await User.findOneAndUpdate(
    { _id: actor.id, role: 'RESPONDER', isActive: true, responderProfile: { $exists: true } },
    {
      $set: {
        'responderProfile.currentLocation': {
          type: 'Point',
          coordinates: [location.lng, location.lat],
        },
      },
    },
    { new: true },
  );

  if (!responder) {
    throw ApiError.notFound('Active responder profile not found.', 'RESPONDER_NOT_FOUND');
  }

  const serialized = serializeResponder(responder, { audience: 'staff' });
  emitToPublic('responder:location', serializeResponder(responder, { audience: 'public' }));
  emitToRole('ADMIN', 'responder:location', serialized);
  return serialized;
}

export async function updateResponderStatus(actor: Actor, status: 'AVAILABLE' | 'OFF_DUTY') {
  if (status === 'OFF_DUTY') {
    const activeMission = await Mission.exists({
      responder: actor.id,
      status: { $in: ACTIVE_MISSION_STATUSES },
    });
    if (activeMission) {
      throw ApiError.conflict('Finish or cancel your active mission before going off duty.', 'ACTIVE_MISSION');
    }
  }

  const responder = await User.findOneAndUpdate(
    { _id: actor.id, role: 'RESPONDER', isActive: true, responderProfile: { $exists: true } },
    { $set: { 'responderProfile.status': status } },
    { new: true },
  );
  if (!responder) {
    throw ApiError.notFound('Active responder profile not found.', 'RESPONDER_NOT_FOUND');
  }

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'RESPONDER_STATUS_CHANGED',
    targetType: 'User',
    targetId: actor.id,
    details: `Responder duty status set to ${status}.`,
    ip: actor.ip,
  });

  const serialized = serializeResponder(responder, { audience: 'staff' });
  emitToPublic('responder:status', serializeResponder(responder, { audience: 'public' }));
  emitToRole('ADMIN', 'responder:status', serialized);
  return serialized;
}
