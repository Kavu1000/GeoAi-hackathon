import { Router } from "express";
import { z } from "zod";
import { Cell } from "../../models/Cell";
import { Measurement } from "../../models/Measurement";
import { Report } from "../../models/Report";
import { cellPolygon } from "../../services/h3.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";

export const cellsRouter = Router();

const MAX_BBOX_DEGREES = 5; // roughly a few hundred km on a side; prevents whole-country dumps

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
    if (q.operator) filter["operatorStats.operator"] = q.operator;

    const cells = await Cell.find(filter).limit(5000).lean();
    const features = cells.map((c) => ({
      type: "Feature" as const,
      properties: {
        h3: c._id,
        status: c.status,
        avgDownloadKbps: c.avgDownloadKbps,
        sampleCount: c.sampleCount,
        reportCount: c.reportCount,
      },
      geometry: { type: "Polygon" as const, coordinates: [cellPolygon(c._id)] },
    }));
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
