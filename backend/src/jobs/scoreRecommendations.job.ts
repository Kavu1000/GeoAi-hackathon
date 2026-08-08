import { Cell } from "../models/Cell";
import { Recommendation } from "../models/Recommendation";
import { cellCentroid } from "../services/h3.service";
import { logger } from "../config/logger";

// Ranks r7 areas that need a tower most: no/weak coverage + report volume as a
// population/demand proxy. Swap the score formula for a real population join
// (WorldPop / Open Buildings) once that data is wired up — see README.
export async function scoreRecommendations(): Promise<{ ranked: number }> {
  const groups = await Cell.aggregate([
    { $match: { status: { $in: ["red", "yellow"] } } },
    {
      $group: {
        _id: "$h3_r7",
        redCells: { $sum: { $cond: [{ $eq: ["$status", "red"] }, 1, 0] } },
        totalCells: { $sum: 1 },
        reportCount: { $sum: "$reportCount" },
        sampleCount: { $sum: "$sampleCount" },
      },
    },
  ]);

  const scored = groups
    .map((g) => {
      const score = g.redCells * 3 + g.reportCount * 2 + Math.max(0, 5 - g.sampleCount);
      const reasons: string[] = [];
      if (g.redCells > 0) reasons.push(`${g.redCells} uncovered cell(s) nearby`);
      if (g.reportCount > 0) reasons.push(`${g.reportCount} user report(s)`);
      if (g.sampleCount < 5) reasons.push("low sample density");
      return { h3_r7: g._id as string, score, reportCount: g.reportCount, sampleCount: g.sampleCount, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 200);

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
        },
        { upsert: true }
      )
    )
  );

  logger.info({ ranked: scored.length }, "recommendation scoring complete");
  return { ranked: scored.length };
}
