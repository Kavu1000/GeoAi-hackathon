import { Router } from "express";
import { Cell, CellStatus, CELL_STATUS_VALUES } from "../../models/Cell";
import { Report } from "../../models/Report";
import { Measurement } from "../../models/Measurement";
import { nearestPopulationCenter } from "../../services/populationProxy.service";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const statsRouter = Router();

// 4G and above counts as "well served" for the headline coverage %/region
// ranking — matches the MODEL step's UNDERSERVED_STATUSES cutoff in
// scoreRecommendations.job.ts (below 4G = a tower-siting candidate).
const WELL_SERVED_STATUSES: CellStatus[] = ["4g", "4g_plus", "5g"];

function emptyStatusCounts(): Record<CellStatus, number> {
  return { none: 0, "2g": 0, "3g": 0, "4g": 0, "4g_plus": 0, "5g": 0 };
}

interface RegionBucket {
  counts: Record<CellStatus, number>;
  confidenceSum: number;
}

statsRouter.get(
  "/overview",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (_req, res) => {
    const [cells, totalMeasurements, openReports, last24hSamples] = await Promise.all([
      Cell.find().select("centroid status confidence").lean(),
      Measurement.estimatedDocumentCount(),
      Report.countDocuments({ status: "new" }),
      Measurement.countDocuments({ recordedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }),
    ]);

    const counts = emptyStatusCounts();
    // Buckets cells by nearest known town (same 11-point list the MODEL step
    // uses for its population proxy — see populationProxy.service.ts) so
    // "coverage near Vientiane" etc. means the same thing everywhere in the
    // app, not a second, disagreeing notion of "region".
    const regionMap = new Map<string, RegionBucket>();
    for (const c of cells) {
      counts[c.status] += 1;
      const [lng, lat] = c.centroid.coordinates;
      const { name } = nearestPopulationCenter(lat, lng);
      const bucket = regionMap.get(name) ?? { counts: emptyStatusCounts(), confidenceSum: 0 };
      bucket.counts[c.status] += 1;
      bucket.confidenceSum += c.confidence ?? 1;
      regionMap.set(name, bucket);
    }

    const regions = [...regionMap.entries()]
      .map(([name, b]) => {
        const totalCells = CELL_STATUS_VALUES.reduce((sum, s) => sum + b.counts[s], 0);
        const wellServed = WELL_SERVED_STATUSES.reduce((sum, s) => sum + b.counts[s], 0);
        return {
          name,
          totalCells,
          counts: b.counts,
          wellServedPct: totalCells ? Math.round((wellServed / totalCells) * 1000) / 10 : 0,
          avgConfidence: totalCells ? Math.round((b.confidenceSum / totalCells) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.totalCells - a.totalCells);

    const totalCells = CELL_STATUS_VALUES.reduce((sum, s) => sum + counts[s], 0);
    const wellServedCells = WELL_SERVED_STATUSES.reduce((sum, s) => sum + counts[s], 0);
    res.json({
      totalCells,
      coveragePct: totalCells ? Math.round((wellServedCells / totalCells) * 1000) / 10 : 0,
      cellsByStatus: counts,
      totalMeasurements,
      openReports,
      last24hSamples,
      regions,
    });
  })
);
