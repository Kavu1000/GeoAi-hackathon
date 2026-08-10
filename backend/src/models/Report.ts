import { Schema, model, Types } from "mongoose";

export type ReportStatus = "new" | "reviewed" | "resolved";

export interface ReportDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  location: { type: "Point"; coordinates: [number, number] };
  h3_r7: string;
  h3_r8: string;
  category: string;
  signal_type?: string;
  province?: string;
  operator?: string;
  comment?: string;
  status: ReportStatus;
  createdAt: Date;
}

const reportSchema = new Schema<ReportDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  h3_r7: { type: String, required: true, index: true },
  h3_r8: { type: String, required: true, index: true },
  category: { type: String, required: true },
  signal_type: { type: String },
  province: { type: String },
  operator: { type: String },
  comment: { type: String, maxlength: 500 },
  status: { type: String, enum: ["new", "reviewed", "resolved"], default: "new", index: true },
  createdAt: { type: Date, default: () => new Date() },
});

reportSchema.index({ location: "2dsphere" });

export const Report = model<ReportDoc>("Report", reportSchema);
