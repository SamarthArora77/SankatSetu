import { Schema, model, type Document, type Types } from 'mongoose';

export interface IAuditLog extends Document<Types.ObjectId> {
  actor?: Types.ObjectId;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, required: true, trim: true, maxlength: 160 },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    targetType: { type: String, required: true, trim: true, maxlength: 60 },
    targetId: { type: String, required: true, trim: true, maxlength: 120 },
    details: { type: String, required: true, trim: true, maxlength: 2000 },
    ipAddress: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
