import * as missionService from '../services/mission.service';
import { serializeEmergency, serializeMission } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';
import { ApiError } from '../utils/ApiError';

async function enrichedMissions(filter: { responder?: string; status?: never }, page: number, limit: number) {
  const { missions, total } = await missionService.listMissions(filter as never, page, limit);
  const emergencyMap = await missionService.getEmergenciesForMissions(missions);
  return {
    missions: missions.map((mission) => {
      const emergency = emergencyMap.get(mission.emergency.toString());
      return {
        ...serializeMission(mission),
        emergency: emergency ? serializeEmergency(emergency, 'staff') : null,
      };
    }),
    total,
  };
}

export const assignMission = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const mission = await missionService.assignMission(req.body, actor);
  sendSuccess(res, 'Mission assigned.', { mission: serializeMission(mission) }, 201);
});

export const claimMission = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const mission = await missionService.claimMission(req.params.emergencyId, actor);
  sendSuccess(res, 'Mission claimed.', { mission: serializeMission(mission) }, 201);
});

export const updateMissionStatus = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const mission = await missionService.updateMissionStatus(req.params.id, req.body, actor);
  sendSuccess(res, 'Mission status updated.', { mission: serializeMission(mission) });
});

export const getMission = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const mission = await missionService.getMissionById(req.params.id);
  if (actor.role !== 'ADMIN' && String(mission.responder) !== actor.id) {
    throw ApiError.forbidden('You can only view your own missions.');
  }
  const emergencyMap = await missionService.getEmergenciesForMissions([mission]);
  const emergency = emergencyMap.get(mission.emergency.toString());
  sendSuccess(res, 'Mission loaded.', {
    mission: serializeMission(mission),
    emergency: emergency ? serializeEmergency(emergency, 'staff') : null,
  });
});

export const listMyMissions = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const status = req.query.status as never;
  const { missions, total } = await enrichedMissions({ responder: actor.id, status }, page, limit);
  sendSuccess(res, 'Your missions loaded.', {
    missions,
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const listMissions = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const status = req.query.status as never;
  const { missions, total } = await enrichedMissions({ status }, page, limit);
  sendSuccess(res, 'Missions loaded.', {
    missions,
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});
