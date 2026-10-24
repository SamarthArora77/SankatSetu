import { z } from 'zod';

export const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid identifier');

export const coordinatesSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  })
  .strict();

export const pageFields = {
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

export const phoneField = z
  .string()
  .trim()
  .regex(/^[+0-9 ()-]{7,25}$/, 'Enter a valid phone number');

export const idParamSchema = z.object({ id: objectIdString });
