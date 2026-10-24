import { Schema } from 'mongoose';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export const geoPointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: 'coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false },
);

export interface MediaAttachment {
  url: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'audio';
}

export const mediaSchema = new Schema<MediaAttachment>(
  {
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['image', 'audio'], required: true },
  },
  { _id: false },
);

export function toPublicGeoPoint(point?: GeoPoint | null) {
  if (!point?.coordinates) return null;
  return { lng: point.coordinates[0], lat: point.coordinates[1] };
}
