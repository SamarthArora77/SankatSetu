import { z } from 'zod';
import {
  EMERGENCY_CATEGORIES,
  EMERGENCY_STATUSES,
  URGENCIES,
  VERIFICATION_STATUSES,
} from '../utils/constants';
import { cleanText } from '../utils/text';

const phone = z
  .string()
  .trim()
  .regex(/^[+0-9 ()-]{7,25}$/, 'Enter a valid phone number')
  .optional();

const personName = z.string().trim().max(160).transform(cleanText).optional();

const categoryInput = z
  .union([
    z.enum(EMERGENCY_CATEGORIES),
    z.array(z.enum(EMERGENCY_CATEGORIES)).min(1).max(6),
  ])
  .transform((value) => (Array.isArray(value) ? Array.from(new Set(value)) : [value]));

const mediaUrl = z
  .string()
  .trim()
  .max(1000)
  .regex(/^\/uploads\/[A-Za-z0-9._-]+$/, 'Media must reference a file created by the upload endpoint')
  .optional();

const voiceMemoUrl = z
  .string()
  .trim()
  .max(1000)
  .regex(/^\/uploads\/[A-Za-z0-9._-]+$/, 'Voice memo must reference a file created by the upload endpoint')
  .optional();

export const createEmergencySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(200)
      .transform(cleanText)
      .refine((value) => value.length >= 3, 'Title must be at least 3 characters'),
    description: z
      .string()
      .trim()
      .min(5, 'Description must be at least 5 characters')
      .max(4000)
      .transform(cleanText)
      .refine((value) => value.length >= 5, 'Description must be at least 5 characters'),
    category: categoryInput,
    location: z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        address: z.string().trim().max(300).transform(cleanText).optional(),
        landmark: z.string().trim().max(200).transform(cleanText).optional(),
      })
      .strict(),
    urgency: z.enum(URGENCIES).default('MEDIUM'),
    peopleCount: z.coerce.number().int().min(1).max(100_000).default(1),
    isAnonymous: z.boolean().default(true),
    isForOther: z.boolean().default(false),
    affectedPersonName: personName,
    reporterName: personName,
    reporterPhone: phone,
    mediaUrl,
    voiceMemoUrl,
    voiceMemoDuration: z.coerce.number().min(0).max(600).optional(),
  })
  .strict();

export const listEmergencyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(EMERGENCY_STATUSES).optional(),
    urgency: z.enum(URGENCIES).optional(),
    category: z.enum(EMERGENCY_CATEGORIES).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  })
  .strict()
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  });

export const nearbyEmergencyQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(0.1).max(50).default(5),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    category: z.enum(EMERGENCY_CATEGORIES).optional(),
  })
  .strict();

export const emergencyIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid emergency identifier'),
});

export const ticketParamSchema = z.object({
  ticketId: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/, 'Invalid ticket identifier'),
});

export const emergencyStatusUpdateSchema = z
  .object({
    status: z.enum(EMERGENCY_STATUSES),
    note: z.string().trim().max(500).transform(cleanText).optional(),
  })
  .strict();

export const emergencyVerificationSchema = z
  .object({
    verificationStatus: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_REVIEW']),
    notes: z.string().trim().max(1000).transform(cleanText).optional(),
    trustScore: z.coerce.number().int().min(0).max(100).optional(),
  })
  .strict();

export type CreateEmergencyInput = z.infer<typeof createEmergencySchema>;
export type ListEmergencyQuery = z.infer<typeof listEmergencyQuerySchema>;
export type EmergencyStatusUpdateInput = z.infer<typeof emergencyStatusUpdateSchema>;
export type EmergencyVerificationInput = z.infer<typeof emergencyVerificationSchema>;

export { EMERGENCY_STATUSES, VERIFICATION_STATUSES };
