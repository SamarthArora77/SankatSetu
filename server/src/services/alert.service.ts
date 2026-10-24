import { Alert } from '../models/Alert';
import type { Role } from '../utils/constants';
import { recordAudit } from './audit.service';
import { notifyRole } from './notification.service';
import { emitToPublic } from './socket.service';
import { serializeAlert } from '../serializers';
import type { CreateAlertInput } from '../schemas/admin.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

export async function createAlert(input: CreateAlertInput, actor: Actor) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + input.expiresInHours * 60 * 60 * 1000);

  const alert = await Alert.create({
    title: input.title,
    message: input.message,
    severity: input.severity,
    affectedZones: input.affectedZones,
    issuedAt,
    expiresAt,
    isActive: true,
    createdBy: actor.id,
  });

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'ALERT_BROADCAST',
    targetType: 'Alert',
    targetId: alert.id,
    details: `Broadcast ${input.severity} alert "${alert.title}" to ${input.affectedZones.join(', ') || 'all zones'}.`,
    ip: actor.ip,
  });

  emitToPublic('alert:new', serializeAlert(alert));

  const notification = {
    type: 'ALERT' as const,
    title: alert.title,
    message: alert.message,
    relatedEntity: { type: 'Alert', id: alert.id },
  };
  void Promise.all(['CITIZEN', 'VOLUNTEER', 'DONOR', 'RESPONDER', 'NGO'].map((role) => notifyRole(role as Role, notification))).catch(
    (error) => console.warn('[notify] Could not fan out alert notifications:', error instanceof Error ? error.message : error),
  );

  return alert;
}

export async function listActiveAlerts(limit = 20) {
  const now = new Date();
  return Alert.find({ isActive: true, expiresAt: { $gt: now } })
    .sort({ issuedAt: -1 })
    .limit(limit);
}

export async function listAlerts(query: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
  severity?: string;
}) {
  const now = new Date();
  const filter: Record<string, unknown> = {};
  if (query.activeOnly) {
    filter.isActive = true;
    filter.expiresAt = { $gt: now };
  }
  if (query.severity) filter.severity = query.severity;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [alerts, total] = await Promise.all([
    Alert.find(filter)
      .sort({ issuedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Alert.countDocuments(filter),
  ]);

  return { alerts, total, page, limit };
}
