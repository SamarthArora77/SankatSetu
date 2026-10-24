import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { extractAccessToken, verifyAccessToken } from '../services/token.service';
import { ApiError } from '../utils/ApiError';

async function resolveUser(req: Request) {
  const token = extractAccessToken(req.cookies, req.headers.authorization);
  if (!token) return null;

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('This account is unavailable.', 'ACCOUNT_UNAVAILABLE');
  }
  if (user.tokenVersion !== payload.ver) {
    throw ApiError.unauthorized('Session has been revoked. Please sign in again.', 'SESSION_REVOKED');
  }

  req.user = {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    organization: user.organization,
  };
  return user;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      throw ApiError.unauthorized('Authentication is required for this action.', 'AUTH_REQUIRED');
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    await resolveUser(req);
    next();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      next();
      return;
    }
    next(error);
  }
}
