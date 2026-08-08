import { Schema, model, Types } from "mongoose";

export type RecommendationStatus = "proposed" | "accepted" | "built";

export interface RecommendationDoc {
  _id: Types.ObjectId;
  h3_r7: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  rank: number;
  score: number;
  reportCount: number;
  sampleCount: number;
  reasons: string[];
  status: RecommendationStatus;
  createdAt: Date;
}

const recommendationSchema = new Schema<RecommendationDoc>({
  h3_r7: { type: String, required: true, unique: true },
  centroid: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  rank: { type: Number, required: true, index: true },
  score: { type: Number, required: true },
  reportCount: { type: Number, default: 0 },
  sampleCount: { type: Number, default: 0 },
  reasons: [{ type: String }],
  status: { type: String, enum: ["proposed", "accepted", "built"], default: "proposed" },
  createdAt: { type: Date, default: () => new Date() },
});

recommendationSchema.index({ centroid: "2dsphere" });

export const Recommendation = model<RecommendationDoc>("Recommendation", recommendationSchema);
