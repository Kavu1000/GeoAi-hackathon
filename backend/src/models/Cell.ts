import { Schema, model } from "mongoose";

// Network generation actually present in a cell — the MAP's primary
// dimension. Ordered worst to best; several services (prediction scoring,
// recommendation ranking) rely on this order, not just the string values.
export type CellStatus = "none" | "2g" | "3g" | "4g" | "4g_plus" | "5g";
export const CELL_STATUS_VALUES: CellStatus[] = ["none", "2g", "3g", "4g", "4g_plus", "5g"];

export interface OperatorStat {
  operator: string;
  avgDownloadKbps: number;
  sampleCount: number;
  /** This operator's own network status in this cell — can differ from the cell's overall (best-across-operators) status. */
  status: CellStatus;
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
    status: { type: String, enum: CELL_STATUS_VALUES, required: true, index: true },
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
        status: { type: String, enum: CELL_STATUS_VALUES },
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
