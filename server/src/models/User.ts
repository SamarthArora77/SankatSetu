import { Schema, model, type Document, type Types } from 'mongoose';
import { RESPONDER_STATUSES, ROLES, VEHICLE_TYPES, type Role } from '../utils/constants';
import { geoPointSchema, type GeoPoint } from './shared';

export interface ResponderProfile {
  team: string;
  vehicleType: (typeof VEHICLE_TYPES)[number];
  status: (typeof RESPONDER_STATUSES)[number];
  currentLocation?: GeoPoint;
  equipment: string[];
}

export interface IUser extends Document<Types.ObjectId> {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  organization?: string;
  isActive: boolean;
  tokenVersion: number;
  responderProfile?: ResponderProfile;
  createdAt: Date;
  updatedAt: Date;
}

const responderProfileSchema = new Schema<ResponderProfile>(
  {
    team: { type: String, trim: true, maxlength: 120 },
    vehicleType: { type: String, enum: VEHICLE_TYPES },
    status: { type: String, enum: RESPONDER_STATUSES, default: 'AVAILABLE' },
    currentLocation: { type: geoPointSchema, required: false },
    equipment: { type: [String], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'CITIZEN' },
    phone: { type: String, trim: true, maxlength: 30 },
    organization: { type: String, trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
    responderProfile: { type: responderProfileSchema, required: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ 'responderProfile.currentLocation': '2dsphere' });
userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser>('User', userSchema);
