import { Schema, model, type Document, type Types } from 'mongoose';
import {
  DONATION_STATUSES,
  DONATION_TYPES,
  type DonationStatus,
  type DonationType,
} from '../utils/constants';
import { geoPointSchema, type GeoPoint } from './shared';

export interface TrackingEvent {
  status: DonationStatus;
  location: string;
  notes?: string;
  verifiedBy?: Types.ObjectId;
  verifiedByName: string;
  at: Date;
}

export interface IDonation extends Document<Types.ObjectId> {
  trackingId: string;
  trackingTokenHash: string;
  donor?: Types.ObjectId;
  donorName: string;
  donorEmail?: string;
  donationType: DonationType;
  itemDescription: string;
  amountOrQuantity: string;
  quantity?: number;
  pickupLocation?: GeoPoint;
  destination: string;
  allocatedCamp?: Types.ObjectId;
  allocatedCampName?: string;
  status: DonationStatus;
  currentLocation: string;
  trackingEvents: TrackingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const trackingEventSchema = new Schema<TrackingEvent>(
  {
    status: { type: String, enum: DONATION_STATUSES, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 500 },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedByName: { type: String, required: true, trim: true, maxlength: 120 },
    at: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const donationSchema = new Schema<IDonation>(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    trackingTokenHash: { type: String, required: true, select: false },
    donor: { type: Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, required: true, trim: true, maxlength: 160 },
    donorEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    donationType: { type: String, enum: DONATION_TYPES, required: true },
    itemDescription: { type: String, required: true, trim: true, maxlength: 500 },
    amountOrQuantity: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: Number, min: 0 },
    pickupLocation: { type: geoPointSchema, required: false },
    destination: { type: String, required: true, trim: true, maxlength: 200 },
    allocatedCamp: { type: Schema.Types.ObjectId, ref: 'ReliefCamp' },
    allocatedCampName: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: DONATION_STATUSES, default: 'REGISTERED', required: true },
    currentLocation: { type: String, required: true, trim: true, maxlength: 200 },
    trackingEvents: { type: [trackingEventSchema], default: [] },
  },
  { timestamps: true },
);

donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ donor: 1, createdAt: -1 });

export const Donation = model<IDonation>('Donation', donationSchema);
