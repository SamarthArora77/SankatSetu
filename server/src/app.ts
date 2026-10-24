import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { uploadRoot } from './config/paths';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';

export function createApp() {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(requestLogger);

  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', fallthrough: true }));

  app.use('/api/v1', apiLimiter, routes);

  app.get('/health', (_req, res) => {
    res.redirect(307, '/api/v1/health');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
