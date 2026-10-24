import { Schema, model, type Document, type Types } from 'mongoose';
import { RESOURCE_CATEGORIES, RESOURCE_STATUSES, type ResourceCategory } from '../utils/constants';
import { geoPointSchema, type GeoPoint } from './shared';

export interface IResource extends Document<Types.ObjectId> {
  name: string;
  category: ResourceCategory;
  quantity: number;
  availableQuantity: number;
  unit: string;
  owner?: Types.ObjectId;
  organizationName: string;
  warehouseName: string;
  location: GeoPoint;
  status: (typeof RESOURCE_STATUSES)[number];
  criticalThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: RESOURCE_CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true, maxlength: 40 },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    organizationName: { type: String, required: true, trim: true, maxlength: 160 },
    warehouseName: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: geoPointSchema, required: true },
    status: { type: String, enum: RESOURCE_STATUSES, default: 'ACTIVE' },
    criticalThreshold: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

resourceSchema.pre('validate', function validateStock(next) {
  if (this.availableQuantity > this.quantity) {
    this.invalidate('availableQuantity', 'availableQuantity cannot exceed quantity');
  }
  next();
});

resourceSchema.index({ location: '2dsphere' });
resourceSchema.index({ category: 1, status: 1 });
resourceSchema.index({ owner: 1 });

export const Resource = model<IResource>('Resource', resourceSchema);
