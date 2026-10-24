import { AuditLog } from '../models/AuditLog';
import { cleanText, maskIp } from '../utils/text';

interface AuditInput {
  actor?: { id: string; name: string };
  actorName?: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actor: input.actor?.id,
      actorName: cleanText(input.actor?.name ?? input.actorName ?? 'System'),
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: cleanText(input.details).slice(0, 2000),
      ipAddress: maskIp(input.ip),
    });
  } catch (error) {
    // Auditing must never break the primary operation, but the failure should be visible.
    console.error('[audit] Failed to record audit event:', error instanceof Error ? error.message : error);
  }
}
