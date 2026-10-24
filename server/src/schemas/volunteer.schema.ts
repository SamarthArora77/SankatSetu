import { z } from 'zod';
import { URGENCIES, VOLUNTEER_CATEGORIES, VOLUNTEER_TASK_STATUSES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { coordinatesSchema, idParamSchema, pageFields } from './common';

export const createVolunteerTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(200).transform(cleanText),
    description: z.string().trim().min(5).max(2000).transform(cleanText),
    category: z.enum(VOLUNTEER_CATEGORIES),
    urgency: z.enum(URGENCIES).default('MEDIUM'),
    location: coordinatesSchema,
    locationName: z.string().trim().min(2).max(200).transform(cleanText),
    requiredVolunteers: z.coerce.number().int().min(1).max(1000),
    timeEstimate: z.string().trim().min(1).max(60).transform(cleanText),
  })
  .strict();

export const volunteerTaskStatusSchema = z
  .object({
    status: z.enum(VOLUNTEER_TASK_STATUSES),
  })
  .strict();

export const volunteerTaskListQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(VOLUNTEER_TASK_STATUSES).optional(),
    category: z.enum(VOLUNTEER_CATEGORIES).optional(),
    urgency: z.enum(URGENCIES).optional(),
    search: z.string().trim().max(120).optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  })
  .strict();

export const volunteerTaskIdParamSchema = idParamSchema;

export const volunteerTaskIdOnlyParamSchema = idParamSchema;

export type CreateVolunteerTaskInput = z.infer<typeof createVolunteerTaskSchema>;
