import { Schema, model, Types } from "mongoose";

export type TowerEstimateMethod = "dbscan_pathloss";

export interface TowerEstimateDoc {
  _id: Types.ObjectId;
  h3_r7: string;
  /** Carrier name (free-text, matches Measurement.operator) — clustering is always per-operator, never blended across carriers. */
  operator: string;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat], refined centroid
  method: TowerEstimateMethod;
  /** 0..1 — see towerInference.service.ts for how this is derived. */
  confidence: number;
  observationCount: number;
  estimatedRadiusM: number;
  /** h3_r8 cells the contributing readings fell into. */
  regionHexes: string[];
  /** Measurement count for this (h3_r7, operator) group at the time this estimate was computed — lets inferTowers.job.ts skip regions with no meaningful new data. */
  measurementCountAtCompute: number;
  lastUpdated: Date;
}

const towerEstimateSchema = new Schema<TowerEstimateDoc>({
  h3_r7: { type: String, required: true, index: true },
  operator: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  method: { type: String, enum: ["dbscan_pathloss"], required: true },
  confidence: { type: Number, required: true },
  observationCount: { type: Number, required: true },
  estimatedRadiusM: { type: Number, required: true },
  regionHexes: [{ type: String }],
  measurementCountAtCompute: { type: Number, required: true },
  lastUpdated: { type: Date, default: () => new Date() },
});

// Non-unique — a single (h3_r7, operator) group can produce more than one
// tower estimate (multiple genuinely separate clusters within one hex).
towerEstimateSchema.index({ h3_r7: 1, operator: 1 });
towerEstimateSchema.index({ location: "2dsphere" });

export const TowerEstimate = model<TowerEstimateDoc>("TowerEstimate", towerEstimateSchema);
