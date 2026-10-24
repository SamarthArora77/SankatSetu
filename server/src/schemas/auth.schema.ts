import { z } from 'zod';
import { PUBLIC_REGISTRATION_ROLES, ROLES } from '../utils/constants';
import { cleanText } from '../utils/text';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const name = z.string().trim().min(2).max(120).transform(cleanText);
const phone = z
  .string()
  .trim()
  .regex(/^[+0-9 ()-]{7,25}$/, 'Enter a valid phone number')
  .optional();

export const registerSchema = z
  .object({
    name,
    email,
    password,
    role: z.enum(PUBLIC_REGISTRATION_ROLES).default('CITIZEN'),
    phone,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export const adminCreateUserSchema = z
  .object({
    name,
    email,
    password,
    role: z.enum(ROLES),
    phone,
    organization: z.string().trim().max(160).optional(),
    responderProfile: z
      .object({
        team: z.string().trim().min(2).max(120),
        vehicleType: z.enum(['AMBULANCE', 'RESCUE_BOAT', 'HIGH_AXLE_TRUCK', 'RAPID_BIKE', 'HELICOPTER']),
        equipment: z.array(z.string().trim().max(100)).max(20).default([]),
        location: z
          .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
          .optional(),
      })
      .optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    phone,
    organization: z.string().trim().max(160).optional(),
  })
  .strict();
