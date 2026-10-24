import * as campService from '../services/camp.service';
import { cachedPublic } from '../services/cache.service';
import { serializeCamp } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser, requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';

function audience(req: Parameters<typeof currentUser>[0]) {
  const user = currentUser(req);
  return user && ['ADMIN', 'NGO', 'RESPONDER'].includes(user.role) ? 'staff' : 'public';
}

export const createCamp = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const camp = await campService.createCamp(req.body, actor);
  sendSuccess(res, 'Relief camp created.', { camp: serializeCamp(camp, 'staff') }, 201);
});

export const listCamps = asyncHandler(async (req, res) => {
  const view = audience(req);
  const buildPayload = async () => {
    const { camps, total, page, limit } = await campService.listCamps(req.query as never);
    return {
      camps: camps.map((camp) => serializeCamp(camp, view)),
      pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
    };
  };
  const payload = (await cachedPublic('camps', { query: req.query, view }, 30, buildPayload)).data;
  sendSuccess(res, 'Relief camps loaded.', payload);
});

export const getCamp = asyncHandler(async (req, res) => {
  const camp = await campService.getCamp(req.params.id);
  sendSuccess(res, 'Relief camp loaded.', { camp: serializeCamp(camp, audience(req)) });
});

export const updateCamp = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const camp = await campService.updateCamp(req.params.id, req.body, actor);
  sendSuccess(res, 'Relief camp updated.', { camp: serializeCamp(camp, 'staff') });
});

export const updateCampOccupancy = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const camp = await campService.updateCampOccupancy(req.params.id, req.body.currentOccupancy, actor);
  sendSuccess(res, 'Camp occupancy updated.', { camp: serializeCamp(camp, 'staff') });
});
