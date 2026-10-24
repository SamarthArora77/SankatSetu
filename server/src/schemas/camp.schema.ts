import { z } from 'zod';
import { CAMP_STATUSES, SUPPLY_STATUSES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { coordinatesSchema, idParamSchema, pageFields, phoneField } from './common';

const service = z.string().trim().min(1).max(80).transform(cleanText);

export const createCampSchema = z
  .object({
    name: z.string().trim().min(2).max(200).transform(cleanText),
    location: coordinatesSchema,
    address: z.string().trim().min(3).max(300).transform(cleanText),
    capacity: z.coerce.number().int().min(1).max(500_000),
    currentOccupancy: z.coerce.number().int().min(0).max(500_000).default(0),
    availableServices: z.array(service).max(30).default([]),
    status: z.enum(CAMP_STATUSES).default('OPEN'),
    contactPerson: z.string().trim().min(2).max(120).transform(cleanText),
    contactPhone: phoneField.optional(),
    suppliesStatus: z.enum(SUPPLY_STATUSES).default('ADEQUATE'),
    hasMedicalPost: z.boolean().default(false),
    hasDrinkingWater: z.boolean().default(false),
    hasPowerBackup: z.boolean().default(false),
  })
  .strict()
  .refine((value) => value.currentOccupancy <= value.capacity, {
    message: 'currentOccupancy cannot exceed capacity',
    path: ['currentOccupancy'],
  });

export const updateCampSchema = z
  .object({
    name: z.string().trim().min(2).max(200).transform(cleanText).optional(),
    location: coordinatesSchema.optional(),
    address: z.string().trim().min(3).max(300).transform(cleanText).optional(),
    capacity: z.coerce.number().int().min(1).max(500_000).optional(),
    availableServices: z.array(service).max(30).optional(),
    status: z.enum(CAMP_STATUSES).optional(),
    contactPerson: z.string().trim().min(2).max(120).transform(cleanText).optional(),
    contactPhone: phoneField.optional(),
    suppliesStatus: z.enum(SUPPLY_STATUSES).optional(),
    hasMedicalPost: z.boolean().optional(),
    hasDrinkingWater: z.boolean().optional(),
    hasPowerBackup: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be supplied');

export const campOccupancySchema = z
  .object({
    currentOccupancy: z.coerce.number().int().min(0).max(500_000),
  })
  .strict();

export const campListQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(CAMP_STATUSES).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();

export const campIdParamSchema = idParamSchema;

export type CreateCampInput = z.infer<typeof createCampSchema>;
export type UpdateCampInput = z.infer<typeof updateCampSchema>;
