import * as responderService from '../services/responder.service';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser, requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';
import { ApiError } from '../utils/ApiError';

export const listResponders = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const staff = Boolean(user && ['ADMIN', 'RESPONDER', 'NGO'].includes(user.role));
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const { responders, total } = await responderService.listResponders(
    {
      status: req.query.status as string | undefined,
      page,
      limit,
    },
    staff ? 'staff' : 'public',
  );

  sendSuccess(res, 'Responders loaded.', {
    responders,
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const listNearbyResponders = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, limit } = req.query as unknown as {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
  };
  const responders = await responderService.listNearbyResponders(lat, lng, radiusKm, limit);
  sendSuccess(res, 'Nearby responders loaded.', {
    responders,
    center: { lat, lng },
    radiusKm,
  });
});

export const getResponder = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const staff = Boolean(user && ['ADMIN', 'RESPONDER', 'NGO'].includes(user.role));
  const responder = await responderService.getResponder(req.params.id, staff ? 'staff' : 'public');
  sendSuccess(res, 'Responder loaded.', { responder });
});

export const updateMyLocation = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const responder = await responderService.updateResponderLocation(actor, req.body.location);
  sendSuccess(res, 'Responder location updated.', { responder });
});

export const updateMyStatus = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const responder = await responderService.updateResponderStatus(actor, req.body.status);
  sendSuccess(res, 'Responder duty status updated.', { responder });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  if (actor.role !== 'RESPONDER') {
    throw ApiError.forbidden('This endpoint is only available to responders.', 'RESPONDER_ONLY');
  }
  const responder = await responderService.getResponder(actor.id, 'staff');
  sendSuccess(res, 'Responder profile loaded.', { responder });
});
