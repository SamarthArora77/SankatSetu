import type { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  res.on('finish', () => {
    // Do not log query strings: ticket tracking tokens are passed there.
    const path = req.originalUrl.split('?')[0];
    console.log(`[http] ${req.method} ${path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
}
