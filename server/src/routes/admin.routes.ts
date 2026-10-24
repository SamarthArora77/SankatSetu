import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { adminCreateUserSchema } from '../schemas/auth.schema';
import {
  adminUpdateUserSchema,
  adminUserListQuerySchema,
  alertListQuerySchema,
  auditLogListQuerySchema,
  createAlertSchema,
} from '../schemas/admin.schema';
import { idParamSchema } from '../schemas/common';

const router = Router();

router.get(
  '/users',
  authenticate,
  authorize('ADMIN'),
  validate(adminUserListQuerySchema, 'query'),
  adminController.listUsers,
);
router.post(
  '/users',
  authenticate,
  authorize('ADMIN'),
  validate(adminCreateUserSchema),
  adminController.createUser,
);
router.patch(
  '/users/:id',
  authenticate,
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(adminUpdateUserSchema),
  adminController.updateUser,
);

router.get(
  '/audit-logs',
  authenticate,
  authorize('ADMIN'),
  validate(auditLogListQuerySchema, 'query'),
  adminController.listAuditLogs,
);

router.post(
  '/alerts',
  authenticate,
  authorize('ADMIN'),
  validate(createAlertSchema),
  adminController.createAlert,
);
router.get(
  '/admin/alerts',
  authenticate,
  authorize('ADMIN'),
  validate(alertListQuerySchema, 'query'),
  adminController.listAlerts,
);

router.get('/stats', authenticate, authorize('ADMIN'), adminController.stats);

export default router;
