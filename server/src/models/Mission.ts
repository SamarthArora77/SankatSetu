import { Schema, model, type Document, type Types } from 'mongoose';
import { MISSION_STATUSES, type MissionStatus } from '../utils/constants';

export interface IMission extends Document<Types.ObjectId> {
  emergency: Types.ObjectId;
  responder: Types.ObjectId;
  status: MissionStatus;
  notes?: string;
  acceptedAt: Date;
  enRouteAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const missionSchema = new Schema<IMission>(
  {
    emergency: { type: Schema.Types.ObjectId, ref: 'Emergency', required: true, index: true },
    responder: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: MISSION_STATUSES, default: 'ASSIGNED', required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    acceptedAt: { type: Date, default: Date.now, required: true },
    enRouteAt: { type: Date },
    arrivedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

missionSchema.index({ emergency: 1, status: 1 });
missionSchema.index({ responder: 1, status: 1 });

export const Mission = model<IMission>('Mission', missionSchema);
