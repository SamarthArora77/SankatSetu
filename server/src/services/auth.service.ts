import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { User, type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../utils/constants';
import { signAccessToken, signRefreshToken } from './token.service';
import { recordAudit } from './audit.service';

const BCRYPT_ROUNDS = 12;

function issueTokens(user: IUser) {
  const tokenUser = { id: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 };
  return {
    accessToken: signAccessToken(tokenUser),
    refreshToken: signRefreshToken(tokenUser),
  };
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'CITIZEN' | 'VOLUNTEER' | 'DONOR';
  phone?: string;
}

export async function register(input: RegisterInput, meta: { ip?: string }) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    phone: input.phone,
  });

  await recordAudit({
    actor: { id: user.id, name: user.name },
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user.id,
    details: `Account created with role ${user.role}.`,
    ip: meta.ip,
  });

  return { user, ...issueTokens(user) };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.', 'ACCOUNT_DISABLED');
  }

  return { user, ...issueTokens(user) };
}

export async function refreshSession(refreshToken: string) {
  const { verifyRefreshToken } = await import('./token.service');
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('This account is unavailable.', 'ACCOUNT_UNAVAILABLE');
  }
  if (user.tokenVersion !== payload.ver) {
    throw ApiError.unauthorized('Session has been revoked. Please sign in again.', 'SESSION_REVOKED');
  }
  return { user, ...issueTokens(user) };
}

export async function logout(userId?: string) {
  if (userId) {
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    await recordAudit({
      actor: { id: userId, name: 'Authenticated user' },
      action: 'USER_LOGOUT',
      targetType: 'User',
      targetId: userId,
      details: 'User signed out; all issued sessions were revoked.',
    });
  }
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('This account is unavailable.', 'ACCOUNT_UNAVAILABLE');
  }
  return user;
}

interface AdminCreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  organization?: string;
  responderProfile?: {
    team: string;
    vehicleType: 'AMBULANCE' | 'RESCUE_BOAT' | 'HIGH_AXLE_TRUCK' | 'RAPID_BIKE' | 'HELICOPTER';
    equipment: string[];
    location?: { lat: number; lng: number };
  };
}

export async function adminCreateUser(input: AdminCreateUserInput, actor: { id: string; name: string }, ip?: string) {
  if (input.role === 'RESPONDER' && !input.responderProfile) {
    throw ApiError.badRequest('A responder profile is required when creating a RESPONDER.', 'RESPONDER_PROFILE_REQUIRED');
  }
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    phone: input.phone,
    organization: input.organization,
    responderProfile: input.responderProfile
      ? {
          team: input.responderProfile.team,
          vehicleType: input.responderProfile.vehicleType,
          equipment: input.responderProfile.equipment,
          status: 'AVAILABLE',
          currentLocation: input.responderProfile.location
            ? {
                type: 'Point',
                coordinates: [input.responderProfile.location.lng, input.responderProfile.location.lat],
              }
            : undefined,
        }
      : undefined,
  });

  await recordAudit({
    actor,
    action: 'PRIVILEGED_USER_CREATED',
    targetType: 'User',
    targetId: user.id,
    details: `Created account for role ${user.role}.`,
    ip,
  });

  return user;
}

export async function setUserActive(userId: string | Types.ObjectId, isActive: boolean, actor: { id: string; name: string }, ip?: string) {
  const user = await User.findById(userId).select('+tokenVersion');
  if (!user) throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  user.isActive = isActive;
  if (!isActive) user.tokenVersion += 1;
  await user.save();

  await recordAudit({
    actor,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'User',
    targetId: user.id,
    details: `Account ${isActive ? 'activated' : 'deactivated'}.`,
    ip,
  });
  return user;
}
