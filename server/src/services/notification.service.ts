import type { Types } from 'mongoose';
import { Notification, type INotification } from '../models/Notification';
import type { Role } from '../utils/constants';
import { serializeNotification } from '../serializers';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { emitToUser } from './socket.service';

interface NotificationInput {
  type: 'EMERGENCY_UPDATE' | 'MISSION_UPDATE' | 'SYSTEM' | 'ALERT' | 'DONATION_UPDATE';
  title: string;
  message: string;
  relatedEntity?: { type: string; id: string };
}

export async function notifyUser(recipient: string | Types.ObjectId, input: NotificationInput) {
  const notification = await Notification.create({
    recipient,
    ...input,
  });
  emitToUser(recipient.toString(), 'notification:new', serializeNotification(notification));
  return notification;
}

export async function notifyRole(role: Role, input: NotificationInput) {
  const users = await User.find({ role, isActive: true }).select('_id');
  for (const user of users) {
    await notifyUser(user.id, input);
  }
}

export async function listNotifications(
  userId: string,
  query: { page?: number; limit?: number; unreadOnly?: boolean },
) {
  const filter: { recipient: string; readAt?: null } = { recipient: userId };
  if (query.unreadOnly) filter.readAt = null;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, readAt: null }),
  ]);

  return { notifications, total, unread, page, limit };
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await Notification.updateMany(
    { recipient: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount;
}

export type { INotification };
