import type { Request } from 'express';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../utils/constants';

export interface RequestUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  organization?: string;
}

export function currentUser(req: Request): RequestUser | undefined {
  return req.user;
}

export function requireUser(req: Request): RequestUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export function requireActor(req: Request) {
  const user = requireUser(req);
  return { id: user.id, role: user.role, name: user.name, email: user.email, organization: user.organization, ip: req.ip };
}
