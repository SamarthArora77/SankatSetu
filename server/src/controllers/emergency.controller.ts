import type { Request } from 'express';
import * as emergencyService from '../services/emergency.service';
import { cachedPublic } from '../services/cache.service';
import { serializeEmergency } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { paginationMeta } from '../utils/pagination';
import type { Role } from '../utils/constants';

type AuthenticatedUser = { id: string; role: Role; name: string; email: string };

function currentUser(req: Request): AuthenticatedUser | undefined {
  return req.user as AuthenticatedUser | undefined;
}

function actorFrom(req: Request) {
  const user = currentUser(req);
  if (!user) throw ApiError.unauthorized();
  return { id: user.id, role: user.role, name: user.name, ip: req.ip };
}

function trackingTokenFrom(req: Request): string | undefined {
  const header = req.headers['x-tracking-token'];
  return typeof header === 'string' && header.length <= 200 ? header.trim() : undefined;
}

export const createEmergency = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const result = await emergencyService.createEmergency(req.body, {
    user: user ? { id: user.id, name: user.name } : undefined,
    ip: req.ip,
  });

  const audience = emergencyService.audienceFor(result.emergency, user);
  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(
    res,
    'Emergency report submitted.',
    {
      emergency: serializeEmergency(result.emergency, audience),
      trackingToken: result.trackingToken,
    },
    201,
  );
});

export const listEmergencies = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const audience = user && ['ADMIN', 'RESPONDER', 'NGO'].includes(user.role) ? 'staff' : 'public';

  const buildPayload = async () => {
    const { emergencies, total, page, limit } = await emergencyService.listEmergencies(
      req.query as never,
      audience,
      user,
    );
    return {
      emergencies: emergencies.map((emergency) =>
        serializeEmergency(emergency, emergencyService.audienceFor(emergency, user)),
      ),
      pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
    };
  };

  const payload = user
    ? await buildPayload()
    : (await cachedPublic('emergencies', { query: req.query }, 20, buildPayload)).data;

  sendSuccess(res, 'Emergency reports loaded.', payload);
});

export const getEmergency = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const emergency = await emergencyService.getEmergencyById(req.params.id);
  sendSuccess(res, 'Emergency report loaded.', {
    emergency: serializeEmergency(emergency, emergencyService.audienceFor(emergency, user)),
  });
});

export const getEmergencyByTicket = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const emergency = await emergencyService.getEmergencyByTicket(req.params.ticketId);
  const token = trackingTokenFrom(req);

  if (!emergencyService.hasTrackingAccess(emergency, user, token)) {
    throw ApiError.unauthorized(
      'A valid tracking token is required to access this report.',
      'TRACKING_TOKEN_REQUIRED',
    );
  }

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, 'Emergency report loaded.', {
    emergency: serializeEmergency(emergency, emergencyService.audienceFor(emergency, user)),
  });
});

export const listNearbyEmergencies = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, limit, category } = req.query as unknown as {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    category?: string;
  };
  const emergencies = await emergencyService.listNearbyEmergencies(lat, lng, radiusKm, limit, category);
  sendSuccess(res, 'Nearby emergency reports loaded.', {
    emergencies: emergencies.map((emergency) => serializeEmergency(emergency, 'public')),
    center: { lat, lng },
    radiusKm,
  });
});

export const updateEmergencyStatus = asyncHandler(async (req, res) => {
  const actor = actorFrom(req);
  const emergency = await emergencyService.updateEmergencyStatus(req.params.id, req.body, actor);
  sendSuccess(res, 'Emergency status updated.', {
    emergency: serializeEmergency(emergency, 'staff'),
  });
});

export const verifyEmergency = asyncHandler(async (req, res) => {
  const actor = actorFrom(req);
  const emergency = await emergencyService.verifyEmergency(req.params.id, req.body, actor);
  sendSuccess(res, 'Emergency verification updated.', {
    emergency: serializeEmergency(emergency, 'staff'),
  });
});

export const analyzeEmergency = asyncHandler(async (req, res) => {
  const actor = actorFrom(req);
  const emergency = await emergencyService.analyzeEmergency(req.params.id, actor);
  sendSuccess(res, 'AI assessment generated. Human review is still required.', {
    emergency: serializeEmergency(emergency, 'staff'),
  });
});
