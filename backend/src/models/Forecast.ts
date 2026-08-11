import { Schema, model, Types } from "mongoose";

export interface ForecastDoc {
  _id: Types.ObjectId;
  h3_r7: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  /** Current gap score — identical to Recommendation.score for the same h3_r7 (both derive from gapScoring.service.ts). */
  gapScoreNow: number;
  gapScore1y: number;
  gapScore3y: number;
  /** Annual %, from populationProxy.service.ts's growthRateProxy() — see that file for the "demo stand-in, not real WorldPop data" caveat. */
  growthRatePercent: number;
  nearestTown: string;
  /** Copied from the underlying GapScore, for UI context (why this area ranks where it does today). */
  reasons: string[];
  computedAt: Date;
}

const forecastSchema = new Schema<ForecastDoc>({
  h3_r7: { type: String, required: true, unique: true },
  centroid: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  gapScoreNow: { type: Number, required: true },
  gapScore1y: { type: Number, required: true },
  gapScore3y: { type: Number, required: true },
  growthRatePercent: { type: Number, required: true },
  nearestTown: { type: String, required: true },
  reasons: [{ type: String }],
  computedAt: { type: Date, default: () => new Date() },
});

forecastSchema.index({ centroid: "2dsphere" });

export const Forecast = model<ForecastDoc>("Forecast", forecastSchema);
