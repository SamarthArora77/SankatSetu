import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { isRedisAvailable } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;

    sendSuccess(res, 'Service health loaded.', {
      status: dbConnected ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      database: { connected: dbConnected },
      cache: { enabled: isRedisAvailable() },
      ai: { configured: Boolean(env.GEMINI_API_KEY), model: env.GEMINI_API_KEY ? env.GEMINI_MODEL : null },
      timestamp: new Date().toISOString(),
    });
  }),
);

export default router;
