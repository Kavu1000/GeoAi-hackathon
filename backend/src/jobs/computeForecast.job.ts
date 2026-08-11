import { Forecast } from "../models/Forecast";
import { cellCentroid } from "../services/h3.service";
import { computeGapScores } from "../services/gapScoring.service";
import { growthRateProxy } from "../services/populationProxy.service";
import { logger } from "../config/logger";

// Forecast Planning: ranks r7 areas by *future* need, not just today's gap —
// current_gap_score(hex) (see gapScoring.service.ts, the same score
// scoreRecommendations.job.ts uses) projected forward with a population
// growth-rate proxy (see populationProxy.service.ts's growthRateProxy — a
// static demo stand-in for real WorldPop multi-year raster data). This is a
// simple exponential projection, not a deep model — that's intentional for
// an MVP: cheap to compute, easy to explain, and swappable for a proper
// time-series model later without changing the API contract, since callers
// only ever consume the three stored scores below.
export async function computeForecast(): Promise<{ ranked: number }> {
  const gapScores = await computeGapScores();

  await Promise.all(
    gapScores.map(async (g) => {
      const [lng, lat] = cellCentroid(g.h3_r7);
      const growthRatePercent = growthRateProxy(lat, lng);
      const factor = 1 + growthRatePercent / 100;

      await Forecast.findOneAndUpdate(
        { h3_r7: g.h3_r7 },
        {
          h3_r7: g.h3_r7,
          centroid: { type: "Point", coordinates: [lng, lat] },
          gapScoreNow: g.score,
          gapScore1y: g.score * factor,
          gapScore3y: g.score * factor ** 3,
          growthRatePercent,
          nearestTown: g.nearestTown,
          reasons: g.reasons,
          computedAt: new Date(),
        },
        { upsert: true }
      );
    })
  );

  logger.info({ ranked: gapScores.length }, "forecast planning complete");
  return { ranked: gapScores.length };
}
