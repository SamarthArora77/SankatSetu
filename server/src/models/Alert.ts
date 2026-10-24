import { Schema, model, type Document, type Types } from 'mongoose';
import { ALERT_SEVERITIES } from '../utils/constants';

export interface IAlert extends Document<Types.ObjectId> {
  title: string;
  message: string;
  severity: (typeof ALERT_SEVERITIES)[number];
  affectedZones: string[];
  issuedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    affectedZones: { type: [String], default: [] },
    issuedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

alertSchema.index({ isActive: 1, expiresAt: 1 });
alertSchema.index({ issuedAt: -1 });

export const Alert = model<IAlert>('Alert', alertSchema);
