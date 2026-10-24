import { z } from 'zod';
import { pageFields } from './common';

export const notificationListQuerySchema = z
  .object({
    ...pageFields,
    unreadOnly: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  })
  .strict();

export const notificationIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid notification identifier'),
});
