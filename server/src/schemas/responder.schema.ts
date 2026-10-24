import { z } from 'zod';
import { RESPONDER_STATUSES } from '../utils/constants';
import { coordinatesSchema, objectIdString, pageFields } from './common';

export const responderLocationSchema = z
  .object({
    location: coordinatesSchema,
  })
  .strict();

export const responderStatusSchema = z
  .object({
    status: z.enum(['AVAILABLE', 'OFF_DUTY']),
  })
  .strict();

export const responderListQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(RESPONDER_STATUSES).optional(),
  })
  .strict();

export const responderIdParamSchema = z.object({ id: objectIdString });

export const responderNearbyQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(0.1).max(100).default(15),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
