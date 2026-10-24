import { Schema, model, type Document, type Types } from 'mongoose';
import { CAMP_STATUSES, SUPPLY_STATUSES } from '../utils/constants';
import { geoPointSchema, type GeoPoint } from './shared';

export interface IReliefCamp extends Document<Types.ObjectId> {
  name: string;
  location: GeoPoint;
  address: string;
  capacity: number;
  currentOccupancy: number;
  availableServices: string[];
  status: (typeof CAMP_STATUSES)[number];
  contactPerson: string;
  contactPhone?: string;
  suppliesStatus: (typeof SUPPLY_STATUSES)[number];
  hasMedicalPost: boolean;
  hasDrinkingWater: boolean;
  hasPowerBackup: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campSchema = new Schema<IReliefCamp>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: geoPointSchema, required: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    capacity: { type: Number, required: true, min: 1 },
    currentOccupancy: { type: Number, required: true, min: 0, default: 0 },
    availableServices: { type: [String], default: [] },
    status: { type: String, enum: CAMP_STATUSES, default: 'OPEN' },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    suppliesStatus: { type: String, enum: SUPPLY_STATUSES, default: 'ADEQUATE' },
    hasMedicalPost: { type: Boolean, default: false },
    hasDrinkingWater: { type: Boolean, default: false },
    hasPowerBackup: { type: Boolean, default: false },
  },
  { timestamps: true },
);

campSchema.pre('validate', function validateOccupancy(next) {
  if (this.currentOccupancy > this.capacity) {
    this.invalidate('currentOccupancy', 'currentOccupancy cannot exceed capacity');
  }
  next();
});

campSchema.index({ location: '2dsphere' });
campSchema.index({ status: 1 });

export const ReliefCamp = model<IReliefCamp>('ReliefCamp', campSchema);
