import { Recommendation } from "../models/Recommendation";
import { cellCentroid } from "../services/h3.service";
import { computeGapScores } from "../services/gapScoring.service";
import { generateAiSummaries, RecommendationCandidate } from "../services/recommendationAi.service";
import { logger } from "../config/logger";

// MODEL step: ranks r7 areas that need a tower most, using the shared gap
// score (see gapScoring.service.ts — also consumed by computeForecast.job.ts
// so the two features can't silently disagree on what "underserved" means).
// DeepSeek R1 (via OpenRouter) then writes a human-readable reason for the
// top candidates; the AI never changes the ranking itself, so the pipeline
// degrades gracefully to the plain formula if OPENROUTER_API_KEY is unset or
// the call fails.
export async function scoreRecommendations(): Promise<{ ranked: number }> {
  const scored = await computeGapScores();

  const candidates: RecommendationCandidate[] = scored.map((s) => ({
    h3_r7: s.h3_r7,
    noSignalCells: s.noSignalCells,
    subFourGCells: s.subFourGCells,
    totalCells: s.totalCells,
    reportCount: s.reportCount,
    sampleCount: s.sampleCount,
    populationProxy: s.populationProxy,
    nearestTown: s.nearestTown,
    distanceKm: s.distanceKm,
    avgConfidence: s.avgConfidence,
    predictedCells: s.predictedCells,
  }));
  const aiSummaries = await generateAiSummaries(candidates);

  await Promise.all(
    scored.map((s, i) =>
      Recommendation.findOneAndUpdate(
        { h3_r7: s.h3_r7 },
        {
          h3_r7: s.h3_r7,
          centroid: { type: "Point", coordinates: cellCentroid(s.h3_r7) },
          rank: i + 1,
          score: s.score,
          reportCount: s.reportCount,
          sampleCount: s.sampleCount,
          reasons: s.reasons,
          populationProxy: s.populationProxy,
          avgConfidence: s.avgConfidence,
          aiSummary: aiSummaries.get(s.h3_r7) ?? null,
        },
        { upsert: true }
      )
    )
  );

  logger.info(
    { ranked: scored.length, aiSummaries: aiSummaries.size },
    "recommendation scoring complete"
  );
  return { ranked: scored.length };
}
