import { z } from 'zod';
import { RESOURCE_CATEGORIES, RESOURCE_STATUSES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { coordinatesSchema, idParamSchema, objectIdString, pageFields } from './common';

const name = z.string().trim().min(2).max(160).transform(cleanText);
const warehouseName = z.string().trim().min(2).max(200).transform(cleanText);
const unit = z.string().trim().min(1).max(40).transform(cleanText);
const quantity = z.coerce.number().int().min(0).max(10_000_000);

export const createResourceSchema = z
  .object({
    name,
    category: z.enum(RESOURCE_CATEGORIES),
    quantity,
    availableQuantity: quantity.optional(),
    unit,
    organizationName: z.string().trim().min(2).max(160).transform(cleanText).optional(),
    warehouseName,
    location: coordinatesSchema,
    status: z.enum(RESOURCE_STATUSES).default('ACTIVE'),
    criticalThreshold: z.coerce.number().int().min(0).max(10_000_000).default(0),
  })
  .strict();

export const updateResourceSchema = z
  .object({
    name: name.optional(),
    category: z.enum(RESOURCE_CATEGORIES).optional(),
    quantity: quantity.optional(),
    availableQuantity: quantity.optional(),
    unit: unit.optional(),
    warehouseName: warehouseName.optional(),
    location: coordinatesSchema.optional(),
    status: z.enum(RESOURCE_STATUSES).optional(),
    criticalThreshold: z.coerce.number().int().min(0).max(10_000_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const dispatchResourceSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(1_000_000),
    targetType: z.enum(['CAMP', 'FIELD', 'EMERGENCY']).default('FIELD'),
    targetId: objectIdString.optional(),
    targetName: z.string().trim().min(2).max(200).transform(cleanText),
    notes: z.string().trim().max(500).transform(cleanText).optional(),
  })
  .strict()
  .refine((value) => value.targetType === 'FIELD' || Boolean(value.targetId), {
    message: 'targetId is required for CAMP and EMERGENCY dispatches',
    path: ['targetId'],
  });

export const resourceListQuerySchema = z
  .object({
    ...pageFields,
    category: z.enum(RESOURCE_CATEGORIES).optional(),
    status: z.enum(RESOURCE_STATUSES).optional(),
    search: z.string().trim().max(120).optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  })
  .strict();

export const resourceIdParamSchema = idParamSchema;

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type DispatchResourceInput = z.infer<typeof dispatchResourceSchema>;
