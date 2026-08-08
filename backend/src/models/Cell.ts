import { Schema, model } from "mongoose";

export type CellStatus = "green" | "yellow" | "red";

export interface OperatorStat {
  operator: string;
  avgDownloadKbps: number;
  sampleCount: number;
}

export interface CellDoc {
  _id: string; // h3_r8 index, used as the primary key
  h3_r7: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  status: CellStatus;
  avgDownloadKbps: number;
  avgSignalDbm: number | null;
  sampleCount: number;
  reportCount: number;
  operatorStats: OperatorStat[];
  /** True if this cell has no real measurements and status/confidence came from predictionGrid.service.ts instead. */
  predicted: boolean;
  /** 0..1 — always 1 for measured cells; interpolation/prior strength for predicted ones. */
  confidence: number;
  lastComputedAt: Date;
}

const cellSchema = new Schema<CellDoc>(
  {
    _id: { type: String },
    h3_r7: { type: String, required: true, index: true },
    centroid: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    status: { type: String, enum: ["green", "yellow", "red"], required: true, index: true },
    avgDownloadKbps: { type: Number, default: 0 },
    avgSignalDbm: { type: Number, default: null },
    sampleCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    operatorStats: [
      {
        _id: false,
        operator: String,
        avgDownloadKbps: Number,
        sampleCount: Number,
      },
    ],
    predicted: { type: Boolean, default: false, index: true },
    confidence: { type: Number, default: 1 },
    lastComputedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

cellSchema.index({ centroid: "2dsphere" });

export const Cell = model<CellDoc>("Cell", cellSchema);
