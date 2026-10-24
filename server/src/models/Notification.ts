import { Schema, model, type Document, type Types } from 'mongoose';
import { NOTIFICATION_TYPES } from '../utils/constants';

export interface INotification extends Document<Types.ObjectId> {
  recipient: Types.ObjectId;
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  message: string;
  relatedEntity?: { type: string; id: string };
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const relatedEntitySchema = new Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 60 },
    id: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    relatedEntity: { type: relatedEntitySchema, required: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
