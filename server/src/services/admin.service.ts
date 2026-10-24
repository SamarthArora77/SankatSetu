import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../models/User';
import { Emergency } from '../models/Emergency';
import { Mission } from '../models/Mission';
import { ReliefCamp } from '../models/ReliefCamp';
import { Donation } from '../models/Donation';
import { VolunteerTask } from '../models/VolunteerTask';
import { AuditLog, type IAuditLog } from '../models/AuditLog';
import { ACTIVE_EMERGENCY_STATUSES, ACTIVE_MISSION_STATUSES, ROLES, type Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/text';
import { recordAudit } from './audit.service';
import { adminCreateUser, setUserActive } from './auth.service';

type AdminCreateUserInput = Parameters<typeof adminCreateUser>[0];

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

export async function listUsers(query: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  isActive?: boolean;
}) {
  const filter: FilterQuery<IUser> = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { organization: pattern }];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit };
}

export async function createUser(input: AdminCreateUserInput, actor: Actor) {
  return adminCreateUser(input, { id: actor.id, name: actor.name }, actor.ip);
}

export async function updateUser(
  userId: string,
  input: {
    isActive?: boolean;
    phone?: string;
    organization?: string;
    name?: string;
  },
  actor: Actor,
) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');

  if (input.isActive === false && userId === actor.id) {
    throw ApiError.badRequest('You cannot deactivate your own account.', 'SELF_DEACTIVATION');
  }

  if (input.isActive === false && user.role === 'RESPONDER') {
    const activeMission = await Mission.exists({
      responder: user.id,
      status: { $in: ACTIVE_MISSION_STATUSES },
    });
    if (activeMission) {
      throw ApiError.conflict(
        'Resolve or reassign this responder’s active mission before deactivating the account.',
        'ACTIVE_MISSION',
      );
    }
  }

  if (input.isActive !== undefined && input.isActive !== user.isActive) {
    await setUserActive(user.id, input.isActive, { id: actor.id, name: actor.name }, actor.ip);
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.organization !== undefined) user.organization = input.organization;

  if (input.name !== undefined || input.phone !== undefined || input.organization !== undefined) {
    await user.save();
    await recordAudit({
      actor: { id: actor.id, name: actor.name },
      action: 'USER_PROFILE_UPDATED_BY_ADMIN',
      targetType: 'User',
      targetId: user.id,
      details: `Administrator updated profile fields for ${user.role} account.`,
      ip: actor.ip,
    });
  }

  return user;
}

export async function listAuditLogs(query: {
  page?: number;
  limit?: number;
  action?: string;
  search?: string;
}) {
  const filter: FilterQuery<IAuditLog> = {};
  if (query.action) filter.action = query.action;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ actorName: pattern }, { details: pattern }, { targetId: pattern }];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page, limit };
}

export async function getAdminStats() {
  const [
    totalUsers,
    usersByRole,
    activeEmergencies,
    criticalEmergencies,
    closedEmergencies,
    activeMissions,
    camps,
    openCamps,
    donations,
    openTasks,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.aggregate<{ _id: Role; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    Emergency.countDocuments({ status: { $in: ACTIVE_EMERGENCY_STATUSES } }),
    Emergency.countDocuments({ urgency: 'CRITICAL', status: { $in: ACTIVE_EMERGENCY_STATUSES } }),
    Emergency.countDocuments({ status: 'RESOLVED' }),
    Mission.countDocuments({ status: { $in: ACTIVE_MISSION_STATUSES } }),
    ReliefCamp.countDocuments(),
    ReliefCamp.countDocuments({ status: 'OPEN' }),
    Donation.countDocuments(),
    VolunteerTask.countDocuments({ status: 'OPEN' }),
  ]);

  const roleCounts = Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<Role, number>;
  for (const entry of usersByRole) {
    roleCounts[entry._id] = entry.count;
  }

  return {
    users: { totalActive: totalUsers, byRole: roleCounts },
    emergencies: {
      active: activeEmergencies,
      critical: criticalEmergencies,
      resolved: closedEmergencies,
    },
    missions: { active: activeMissions },
    camps: { total: camps, open: openCamps },
    donations: { total: donations },
    volunteerTasks: { open: openTasks },
  };
}
