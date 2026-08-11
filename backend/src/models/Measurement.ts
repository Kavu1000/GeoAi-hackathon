import { Schema, model, Types } from "mongoose";

export type NetworkType = "none" | "2g" | "3g" | "4g" | "5g" | "wifi";

export interface MeasurementDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  location: { type: "Point"; coordinates: [number, number] };
  h3_r7: string;
  h3_r8: string;
  operator?: string;
  networkType: NetworkType;
  signalDbm?: number;
  /** GPS accuracy radius in meters, when the platform reports one — not populated by every caller (e.g. mobile doesn't send it yet). */
  accuracyM?: number;
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  source: "auto" | "speedtest" | "recording";
  recordedAt: Date;
  createdAt: Date;
}

const measurementSchema = new Schema<MeasurementDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  h3_r7: { type: String, required: true, index: true },
  h3_r8: { type: String, required: true, index: true },
  operator: { type: String },
  networkType: { type: String, enum: ["none", "2g", "3g", "4g", "5g", "wifi"], required: true },
  signalDbm: { type: Number },
  accuracyM: { type: Number },
  latencyMs: { type: Number },
  downloadKbps: { type: Number },
  uploadKbps: { type: Number },
  source: { type: String, enum: ["auto", "speedtest", "recording"], default: "auto" },
  recordedAt: { type: Date, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

measurementSchema.index({ location: "2dsphere" });
measurementSchema.index({ h3_r8: 1, recordedAt: -1 });
// Raw samples are aggregated into Cell docs; keep the collection bounded.
measurementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Measurement = model<MeasurementDoc>("Measurement", measurementSchema);
