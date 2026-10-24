import * as notificationService from '../services/notification.service';
import { serializeNotification } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';

export const listNotifications = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const { notifications, total, unread, page, limit } = await notificationService.listNotifications(
    actor.id,
    req.query as never,
  );
  sendSuccess(res, 'Notifications loaded.', {
    notifications: notifications.map(serializeNotification),
    unread,
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const notification = await notificationService.markNotificationRead(req.params.id, actor.id);
  sendSuccess(res, 'Notification marked as read.', {
    notification: serializeNotification(notification),
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const updated = await notificationService.markAllNotificationsRead(actor.id);
  sendSuccess(res, 'All notifications marked as read.', { updated });
});
