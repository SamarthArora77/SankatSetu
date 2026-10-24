import { z } from 'zod';
import { MISSION_STATUSES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { coordinatesSchema, idParamSchema, objectIdString, pageFields } from './common';

const note = z.string().trim().max(1000).transform(cleanText).optional();

export const assignMissionSchema = z
  .object({
    emergencyId: objectIdString,
    responderId: objectIdString,
    notes: note,
  })
  .strict();

export const claimMissionSchema = z
  .object({
    notes: note,
  })
  .strict();

export const missionStatusUpdateSchema = z
  .object({
    status: z.enum(MISSION_STATUSES),
    notes: note,
    location: coordinatesSchema.optional(),
  })
  .strict();

export const missionListQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(MISSION_STATUSES).optional(),
  })
  .strict();

export const missionIdParamSchema = idParamSchema;

export const claimMissionParamSchema = z.object({ emergencyId: objectIdString });

export type AssignMissionInput = z.infer<typeof assignMissionSchema>;
export type MissionStatusUpdateInput = z.infer<typeof missionStatusUpdateSchema>;
