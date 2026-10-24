import { z } from 'zod';
import { DONATION_STATUSES, DONATION_TYPES } from '../utils/constants';
import { cleanText } from '../utils/text';
import { coordinatesSchema, idParamSchema, objectIdString, pageFields } from './common';

export const createDonationSchema = z
  .object({
    donorName: z.string().trim().min(2).max(160).transform(cleanText).optional(),
    donorEmail: z.string().trim().toLowerCase().email('Enter a valid email address').max(160).optional(),
    donationType: z.enum(DONATION_TYPES),
    itemDescription: z.string().trim().min(5).max(500).transform(cleanText),
    amountOrQuantity: z.string().trim().min(1).max(160).transform(cleanText),
    quantity: z.coerce.number().int().min(0).max(10_000_000).optional(),
    destination: z.string().trim().min(2).max(200).transform(cleanText).optional(),
    allocatedCampId: objectIdString.optional(),
    pickupLocation: coordinatesSchema.optional(),
  })
  .strict();

export const donationEventSchema = z
  .object({
    status: z.enum(DONATION_STATUSES),
    location: z.string().trim().min(2).max(200).transform(cleanText),
    notes: z.string().trim().max(500).transform(cleanText).optional(),
  })
  .strict();

export const donationListQuerySchema = z
  .object({
    ...pageFields,
    status: z.enum(DONATION_STATUSES).optional(),
    donationType: z.enum(DONATION_TYPES).optional(),
    search: z.string().trim().max(120).optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  })
  .strict();

export const donationIdParamSchema = idParamSchema;

export const trackingParamSchema = z.object({
  trackingId: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/, 'Invalid tracking identifier'),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type DonationEventInput = z.infer<typeof donationEventSchema>;
