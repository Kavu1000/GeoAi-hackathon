import { Cell } from "../models/Cell";
import { cellCentroid } from "./h3.service";
import { populationProxyScore, nearestPopulationCenter } from "./populationProxy.service";

// Below 4G counts as "underserved" for tower-siting purposes — 4G/4G+/5G
// cells are considered adequately served and don't factor into the ranking.
const UNDERSERVED_STATUSES = ["none", "2g", "3g"];

export interface GapScore {
  h3_r7: string;
  score: number;
  reportCount: number;
  sampleCount: number;
  noSignalCells: number;
  subFourGCells: number;
  totalCells: number;
  reasons: string[];
  populationProxy: number;
  nearestTown: string;
  distanceKm: number;
  avgConfidence: number;
  predictedCells: number;
}

// Shared by scoreRecommendations.job.ts (MODEL step: "what needs a tower
// now") and computeForecast.job.ts (MODEL step: "what will need one soon" —
// this score is future_priority's current_gap_score(hex) term). Extracted
// out of scoreRecommendations so the two features can never silently drift
// apart on what "underserved" means — this is the one place that logic
// lives. The ranking formula blends no/weak coverage, report volume, and a
// population-density proxy (see populationProxy.service.ts — a demo
// stand-in for a real WorldPop / Meta HRSL / Google Open Buildings join).
export async function computeGapScores(): Promise<GapScore[]> {
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

  return groups
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
}
