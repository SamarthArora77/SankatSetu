import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../utils/constants';

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('Your role does not permit this action.', 'ROLE_FORBIDDEN'));
      return;
    }
    next();
  };
}
