import { Schema, model, type Document, type Types } from 'mongoose';
import {
  EMERGENCY_CATEGORIES,
  EMERGENCY_STATUSES,
  URGENCIES,
  VERIFICATION_STATUSES,
  type EmergencyCategory,
  type EmergencyStatus,
  type Urgency,
  type VerificationStatus,
} from '../utils/constants';
import { geoPointSchema, mediaSchema, type GeoPoint, type MediaAttachment } from './shared';

export interface AiAssessment {
  category?: EmergencyCategory;
  suggestedUrgency?: Urgency;
  possibleHazards: string[];
  suggestedResources: string[];
  reasoningSummary: string;
  requiresHumanReview: boolean;
  imageAuthenticityConfidence?: number;
  peopleCountEstimate?: number;
  model: string;
  analyzedAt: Date;
}

export interface IEmergency extends Document<Types.ObjectId> {
  ticketId: string;
  title: string;
  description: string;
  category: EmergencyCategory[];
  location: GeoPoint;
  address?: string;
  landmark?: string;
  urgency: Urgency;
  status: EmergencyStatus;
  peopleCount: number;
  isAnonymous: boolean;
  isForOther: boolean;
  affectedPersonName?: string;
  reportedBy?: Types.ObjectId;
  reporterName?: string;
  reporterPhone?: string;
  media?: MediaAttachment;
  mediaUrl?: string;
  voiceMemoUrl?: string;
  voiceMemoDuration?: number;
  aiAssessment?: AiAssessment;
  verificationStatus: VerificationStatus;
  trustScore: number;
  trustSignals: string[];
  corroboratingReportCount: number;
  assignedMission?: Types.ObjectId;
  assignedResponder?: Types.ObjectId;
  assignedResponderName?: string;
  assignedAt?: Date;
  resolvedAt?: Date;
  trackingTokenHash: string;
  submissionIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiAssessmentSchema = new Schema<AiAssessment>(
  {
    category: { type: String, enum: EMERGENCY_CATEGORIES },
    suggestedUrgency: { type: String, enum: URGENCIES },
    possibleHazards: { type: [String], default: [] },
    suggestedResources: { type: [String], default: [] },
    reasoningSummary: { type: String, default: '', maxlength: 2000 },
    requiresHumanReview: { type: Boolean, default: true },
    imageAuthenticityConfidence: { type: Number, min: 0, max: 1 },
    peopleCountEstimate: { type: Number, min: 0 },
    model: { type: String, required: true },
    analyzedAt: { type: Date, required: true },
  },
  { _id: false },
);

const emergencySchema = new Schema<IEmergency>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 5, maxlength: 4000 },
    category: {
      type: [{ type: String, enum: EMERGENCY_CATEGORIES }],
      required: true,
      validate: {
        validator: (value: EmergencyCategory[]) => Array.isArray(value) && value.length > 0,
        message: 'At least one emergency category is required',
      },
    },
    location: { type: geoPointSchema, required: true },
    address: { type: String, trim: true, maxlength: 300 },
    landmark: { type: String, trim: true, maxlength: 200 },
    urgency: { type: String, enum: URGENCIES, default: 'MEDIUM', required: true },
    status: { type: String, enum: EMERGENCY_STATUSES, default: 'PENDING', required: true },
    peopleCount: { type: Number, min: 1, max: 100000, default: 1 },
    isAnonymous: { type: Boolean, required: true },
    isForOther: { type: Boolean, default: false },
    affectedPersonName: { type: String, trim: true, maxlength: 160 },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reporterName: { type: String, trim: true, maxlength: 120 },
    reporterPhone: { type: String, trim: true, maxlength: 30 },
    media: { type: mediaSchema, required: false },
    mediaUrl: { type: String, trim: true, maxlength: 1000 },
    voiceMemoUrl: { type: String, trim: true, maxlength: 1000 },
    voiceMemoDuration: { type: Number, min: 0, max: 600 },
    aiAssessment: { type: aiAssessmentSchema, required: false },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      required: true,
    },
    trustScore: { type: Number, min: 0, max: 100, default: 0 },
    trustSignals: { type: [String], default: [] },
    corroboratingReportCount: { type: Number, min: 0, default: 0 },
    assignedMission: { type: Schema.Types.ObjectId, ref: 'Mission' },
    assignedResponder: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedResponderName: { type: String, trim: true, maxlength: 160 },
    assignedAt: { type: Date },
    resolvedAt: { type: Date },
    trackingTokenHash: { type: String, required: true, select: false },
    submissionIpHash: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.trackingTokenHash;
        delete ret.submissionIpHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

emergencySchema.index({ location: '2dsphere' });
emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ urgency: 1, status: 1 });
emergencySchema.index({ category: 1, status: 1 });
emergencySchema.index({ createdAt: -1 });
emergencySchema.index({ title: 'text', description: 'text' });

export const Emergency = model<IEmergency>('Emergency', emergencySchema);
