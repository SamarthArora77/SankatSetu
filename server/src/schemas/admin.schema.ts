import { z } from 'zod';
import { ALERT_SEVERITIES, ROLES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { idParamSchema, pageFields, phoneField } from './common';

export const adminUserListQuerySchema = z
  .object({
    ...pageFields,
    role: z.enum(ROLES).optional(),
    search: z.string().trim().max(120).optional(),
    isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  })
  .strict();

export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    phone: phoneField.optional(),
    organization: z.string().trim().max(160).transform(cleanText).optional(),
    name: z.string().trim().min(2).max(120).transform(cleanText).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const createAlertSchema = z
  .object({
    title: z.string().trim().min(3).max(200).transform(cleanText),
    message: z.string().trim().min(5).max(2000).transform(cleanText),
    severity: z.enum(ALERT_SEVERITIES),
    affectedZones: z.array(z.string().trim().min(1).max(100).transform(cleanText)).max(20).default([]),
    expiresInHours: z.coerce.number().int().min(1).max(168).default(24),
  })
  .strict();

export const alertListQuerySchema = z
  .object({
    ...pageFields,
    activeOnly: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    severity: z.enum(ALERT_SEVERITIES).optional(),
  })
  .strict();

export const alertIdParamSchema = idParamSchema;

export const auditLogListQuerySchema = z
  .object({
    ...pageFields,
    action: z.string().trim().max(80).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
