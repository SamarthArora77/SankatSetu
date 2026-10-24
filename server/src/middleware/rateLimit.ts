import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const skip = () => env.NODE_ENV === 'test';

function buildLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMITED',
        errors: [],
      });
    },
  });
}

export const apiLimiter = buildLimiter(15 * 60 * 1000, 300, 'Too many requests. Please slow down.');
export const authLimiter = buildLimiter(15 * 60 * 1000, 20, 'Too many authentication attempts. Try again later.');
export const publicReportLimiter = buildLimiter(60 * 60 * 1000, 15, 'Too many emergency reports from this network. Contact emergency services by phone if this is urgent.');
export const uploadLimiter = buildLimiter(60 * 60 * 1000, 30, 'Too many uploads. Try again later.');
export const aiLimiter = buildLimiter(60 * 60 * 1000, 10, 'AI analysis limit reached. Try again later.');
export const trackLimiter = buildLimiter(15 * 60 * 1000, 90, 'Too many tracking requests. Try again later.');
