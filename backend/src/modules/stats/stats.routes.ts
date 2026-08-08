import { Router } from "express";
import { Cell } from "../../models/Cell";
import { Report } from "../../models/Report";
import { Measurement } from "../../models/Measurement";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const statsRouter = Router();

statsRouter.get(
  "/overview",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (_req, res) => {
    const [byStatus, totalMeasurements, openReports, last24hSamples] = await Promise.all([
      Cell.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Measurement.estimatedDocumentCount(),
      Report.countDocuments({ status: "new" }),
      Measurement.countDocuments({ recordedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }),
    ]);
    const counts = { green: 0, yellow: 0, red: 0 } as Record<string, number>;
    for (const row of byStatus) counts[row._id] = row.count;
    const totalCells = counts.green + counts.yellow + counts.red;
    res.json({
      totalCells,
      coveragePct: totalCells ? Math.round(((counts.green + counts.yellow) / totalCells) * 1000) / 10 : 0,
      cellsByStatus: counts,
      totalMeasurements,
      openReports,
      last24hSamples,
    });
  })
);
