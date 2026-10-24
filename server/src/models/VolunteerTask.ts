import { Schema, model, type Document, type Types } from 'mongoose';
import {
  URGENCIES,
  VOLUNTEER_CATEGORIES,
  VOLUNTEER_TASK_STATUSES,
  type Urgency,
} from '../utils/constants';
import { geoPointSchema, type GeoPoint } from './shared';

export interface VolunteerAssignment {
  volunteer: Types.ObjectId;
  joinedAt: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
}

export interface IVolunteerTask extends Document<Types.ObjectId> {
  title: string;
  description: string;
  category: (typeof VOLUNTEER_CATEGORIES)[number];
  urgency: Urgency;
  location: GeoPoint;
  locationName: string;
  requiredVolunteers: number;
  assignedVolunteers: VolunteerAssignment[];
  status: (typeof VOLUNTEER_TASK_STATUSES)[number];
  timeEstimate: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<VolunteerAssignment>(
  {
    volunteer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now, required: true },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
  },
  { _id: false },
);

const volunteerTaskSchema = new Schema<IVolunteerTask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: VOLUNTEER_CATEGORIES, required: true },
    urgency: { type: String, enum: URGENCIES, default: 'MEDIUM' },
    location: { type: geoPointSchema, required: true },
    locationName: { type: String, required: true, trim: true, maxlength: 200 },
    requiredVolunteers: { type: Number, required: true, min: 1, max: 1000 },
    assignedVolunteers: { type: [assignmentSchema], default: [] },
    status: { type: String, enum: VOLUNTEER_TASK_STATUSES, default: 'OPEN' },
    timeEstimate: { type: String, required: true, trim: true, maxlength: 60 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

volunteerTaskSchema.index({ location: '2dsphere' });
volunteerTaskSchema.index({ status: 1, createdAt: -1 });

export const VolunteerTask = model<IVolunteerTask>('VolunteerTask', volunteerTaskSchema);
