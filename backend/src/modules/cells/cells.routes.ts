import { Router } from "express";
import { z } from "zod";
import { Cell } from "../../models/Cell";
import { Measurement } from "../../models/Measurement";
import { Report } from "../../models/Report";
import { cellPolygon } from "../../services/h3.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";

export const cellsRouter = Router();

// Laos itself spans ~8.6° lat x ~7.5° lng end to end, so the cap has to
// clear that for the dashboard's "All Laos" view — this still isn't
// "unlimited": it's sized to the one country this app covers, not an
// arbitrary large-area guard.
const MAX_BBOX_DEGREES = 10;
// ~40-46k cells exist nationwide at any time (see predictCoverage.job.ts's
// full-country grid) — capped comfortably above that so a whole-country
// request doesn't silently truncate and leave gaps on the map.
const MAX_CELLS_RETURNED = 50000;

const bboxSchema = z.object({
  minLng: z.coerce.number(),
  minLat: z.coerce.number(),
  maxLng: z.coerce.number(),
  maxLat: z.coerce.number(),
  operator: z.string().optional(),
});

cellsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = bboxSchema.parse(req.query);
    if (q.maxLng - q.minLng > MAX_BBOX_DEGREES || q.maxLat - q.minLat > MAX_BBOX_DEGREES) {
      throw new ApiError(400, "bbox_too_large");
    }
    const filter: Record<string, unknown> = {
      centroid: {
        $geoWithin: {
          $box: [
            [q.minLng, q.minLat],
            [q.maxLng, q.maxLat],
          ],
        },
      },
    };
    // Predicted cells never carry operatorStats — the interpolation/prior
    // model doesn't know which carrier it's guessing about — so an operator
    // filter must not throw them out too, or the map goes blank everywhere
    // except the handful of cells that operator has real measurements in.
    // They stay visible (as the model's general estimate) for every
    // operator; only *measured* cells get filtered down to that operator's
    // own data.
    //
    // Real cells with an empty operatorStats (e.g. web-submitted readings —
    // browsers can't read a device's carrier, so those never populate
    // operatorStats) correctly stay hidden under a specific operator
    // filter: we have no idea which carrier that reading was actually on,
    // so showing it as if it were, say, Unitel's coverage would be
    // misattributing real data to an operator it was never confirmed to be
    // from. It still counts toward the cell's overall (unfiltered) picture.
    if (q.operator) filter.$or = [{ "operatorStats.operator": q.operator }, { predicted: true }];

    const cells = await Cell.find(filter).limit(MAX_CELLS_RETURNED).lean();
    const features = cells.map((c) => {
      // Filtered to one operator: show *that operator's* status/speed, not
      // the cell's overall best-across-operators blend — a cell with great
      // Unitel coverage and no Tplus coverage shouldn't show Unitel's
      // numbers when the map is filtered down to Tplus.
      const opStat = q.operator ? c.operatorStats.find((o) => o.operator === q.operator) : undefined;
      return {
        type: "Feature" as const,
        properties: {
          h3: c._id,
          status: opStat?.status ?? c.status,
          avgDownloadKbps: opStat?.avgDownloadKbps ?? c.avgDownloadKbps,
          // Not tracked per-operator (operatorStats has no latency field) —
          // this is always the cell's overall average, even when filtered.
          avgLatencyMs: c.avgLatencyMs ?? null,
          sampleCount: opStat?.sampleCount ?? c.sampleCount,
          reportCount: c.reportCount,
          predicted: c.predicted,
          confidence: c.confidence,
        },
        geometry: { type: "Polygon" as const, coordinates: [cellPolygon(c._id)] },
      };
    });
    res.json({ type: "FeatureCollection", features });
  })
);

cellsRouter.get(
  "/:h3",
  asyncHandler(async (req, res) => {
    const cell = await Cell.findById(req.params.h3).lean();
    if (!cell) throw new ApiError(404, "cell_not_found");
    const [recentMeasurements, recentReports] = await Promise.all([
      Measurement.find({ h3_r8: req.params.h3 }).sort({ recordedAt: -1 }).limit(20).lean(),
      Report.find({ h3_r8: req.params.h3 }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    res.json({ cell, recentMeasurements, recentReports });
  })
);
