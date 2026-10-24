import * as authService from '../services/auth.service';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
  verifyRefreshToken,
} from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { serializeUser } from '../serializers';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, { ip: req.ip });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, 'Account created successfully.', { user: serializeUser(result.user) }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, 'Signed in successfully.', { user: serializeUser(result.user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, 'Current user loaded.', { user: serializeUser(user) });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    throw ApiError.unauthorized('No refresh session was provided.', 'REFRESH_REQUIRED');
  }
  const result = await authService.refreshSession(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, 'Session refreshed.', { refreshed: true });
});

export const logout = asyncHandler(async (req, res) => {
  let userId = req.user?.id;
  if (!userId && req.cookies?.[REFRESH_COOKIE]) {
    try {
      userId = verifyRefreshToken(req.cookies[REFRESH_COOKIE]).sub;
    } catch {
      userId = undefined;
    }
  }
  await authService.logout(userId);
  clearAuthCookies(res);
  sendSuccess(res, 'Signed out successfully.', { loggedOut: true });
});
