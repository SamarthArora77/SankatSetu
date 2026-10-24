import type { CorsOptions } from 'cors';
import { ApiError } from '../utils/ApiError';
import { env } from './env';

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Requests without an Origin header come from curl, tests, or server-to-server clients.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(403, 'Origin is not allowed by CORS.', 'CORS_FORBIDDEN'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tracking-Token'],
};

export const socketCorsOptions = {
  origin: env.clientOrigins,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tracking-Token'],
};
