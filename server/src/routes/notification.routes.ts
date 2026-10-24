import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from '../schemas/notification.schema';

const router = Router();

router.get('/', authenticate, validate(notificationListQuerySchema, 'query'), notificationController.listNotifications);
router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  notificationController.markNotificationRead,
);
router.patch('/read-all', authenticate, notificationController.markAllNotificationsRead);

export default router;
