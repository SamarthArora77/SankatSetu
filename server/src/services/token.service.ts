import type { Response } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';

export const ACCESS_COOKIE = 'rs_access';
export const REFRESH_COOKIE = 'rs_refresh';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  ver: number;
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  ver: number;
  type: 'refresh';
}

interface TokenUser {
  id: string;
  role: Role;
  tokenVersion: number;
}

export function signAccessToken(user: TokenUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, ver: user.tokenVersion, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
  );
}

export function signRefreshToken(user: TokenUser): string {
  return jwt.sign(
    { sub: user.id, ver: user.tokenVersion, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new Error('Malformed access token');
    }
    return payload as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired session. Please sign in again.', 'INVALID_TOKEN');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || payload.type !== 'refresh' || typeof payload.sub !== 'string') {
      throw new Error('Malformed refresh token');
    }
    return payload as RefreshTokenPayload;
  } catch {
    throw ApiError.unauthorized('Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
  }
}

const baseCookie = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: (env.isProduction ? 'none' : 'lax') as 'none' | 'lax',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie,
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie, path: '/api/v1/auth' });
}

export function extractAccessToken(cookies: Record<string, string> | undefined, authorization?: string): string | null {
  if (cookies?.[ACCESS_COOKIE]) return cookies[ACCESS_COOKIE];
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  return null;
}
