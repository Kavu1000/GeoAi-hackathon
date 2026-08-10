import { Cell } from "../models/Cell";
import { Recommendation } from "../models/Recommendation";
import { cellCentroid } from "../services/h3.service";
import { populationProxyScore, nearestPopulationCenter } from "../services/populationProxy.service";
import { generateAiSummaries, RecommendationCandidate } from "../services/recommendationAi.service";
import { logger } from "../config/logger";

// MODEL step: ranks r7 areas that need a tower most. The ranking formula
// blends no/weak coverage, report volume, and a population-density proxy
// (see populationProxy.service.ts — a demo stand-in for a real WorldPop /
// Meta HRSL / Google Open Buildings join). DeepSeek R1 (via OpenRouter) then
// writes a human-readable reason for the top candidates; the AI never
// changes the ranking itself, so the pipeline degrades gracefully to the
// plain formula if OPENROUTER_API_KEY is unset or the call fails.
// Below 4G counts as "underserved" for tower-siting purposes — 4G/4G+/5G
// cells are considered adequately served and don't factor into the ranking.
const UNDERSERVED_STATUSES = ["none", "2g", "3g"];

export async function scoreRecommendations(): Promise<{ ranked: number }> {
  const groups = await Cell.aggregate([
    { $match: { status: { $in: UNDERSERVED_STATUSES } } },
    {
      $group: {
        _id: "$h3_r7",
        noSignalCells: { $sum: { $cond: [{ $eq: ["$status", "none"] }, 1, 0] } },
        subFourGCells: { $sum: { $cond: [{ $in: ["$status", ["2g", "3g"]] }, 1, 0] } },
        totalCells: { $sum: 1 },
        reportCount: { $sum: "$reportCount" },
        sampleCount: { $sum: "$sampleCount" },
        avgConfidence: { $avg: "$confidence" },
        predictedCells: { $sum: { $cond: ["$predicted", 1, 0] } },
      },
    },
  ]);

  const scored = groups
    .map((g) => {
      const h3_r7 = g._id as string;
      const [lng, lat] = cellCentroid(h3_r7);
      const populationProxy = populationProxyScore(lat, lng);
      const { name: nearestTown, distanceKm } = nearestPopulationCenter(lat, lng);
      const avgConfidence = g.avgConfidence ?? 1;

      // Population proxy is weighted like a fourth "report-equivalent" —
      // a no-signal area near a populated town outranks an equally bad
      // but empty one. The whole thing is then scaled by how confident we
      // are in the underlying cells: a block of real measured "no signal"
      // cells should outrank an equally bad-looking block that's mostly
      // the model's low-confidence guess.
      const rawScore =
        g.noSignalCells * 3 + g.subFourGCells * 1.5 + g.reportCount * 2 + Math.max(0, 5 - g.sampleCount) + populationProxy * 4;
      const score = rawScore * (0.5 + avgConfidence * 0.5);

      const reasons: string[] = [];
      if (g.noSignalCells > 0) reasons.push(`${g.noSignalCells} cell(s) with no signal nearby`);
      if (g.subFourGCells > 0) reasons.push(`${g.subFourGCells} cell(s) stuck on 2G/3G`);
      if (g.reportCount > 0) reasons.push(`${g.reportCount} user report(s)`);
      if (g.sampleCount < 5) reasons.push("low sample density");
      if (populationProxy > 0.05) reasons.push(`near ${nearestTown} (population proxy ${populationProxy.toFixed(2)})`);
      if (g.predictedCells > 0)
        reasons.push(`${g.predictedCells} predicted (unmeasured) cell(s), avg confidence ${avgConfidence.toFixed(2)}`);

      return {
        h3_r7,
        score,
        reportCount: g.reportCount,
        sampleCount: g.sampleCount,
        noSignalCells: g.noSignalCells,
        subFourGCells: g.subFourGCells,
        totalCells: g.totalCells,
        reasons,
        populationProxy,
        nearestTown,
        distanceKm,
        avgConfidence,
        predictedCells: g.predictedCells,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 200);

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
