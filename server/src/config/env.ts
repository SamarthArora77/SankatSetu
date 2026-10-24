import 'dotenv/config';
import { z } from 'zod';

const booleanish = z
  .string()
  .optional()
  .transform((value) => value === '1' || value?.toLowerCase() === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  TRUST_PROXY: booleanish,
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  REDIS_URL: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().min(1).max(25).default(5),
  SEED_DEMO_PASSWORD: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const values = parsed.data;
const isProduction = values.NODE_ENV === 'production';

let jwtSecret = values.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production.');
  }
  jwtSecret = 'development-only-secret-change-before-deploying-32chars';
  if (values.NODE_ENV === 'development') {
    console.warn('[env] JWT_SECRET is not set. Using a development-only secret.');
  }
} else if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

export const env = {
  ...values,
  JWT_SECRET: jwtSecret,
  isProduction,
  isTest: values.NODE_ENV === 'test',
  clientOrigins: values.CLIENT_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type Env = typeof env;
