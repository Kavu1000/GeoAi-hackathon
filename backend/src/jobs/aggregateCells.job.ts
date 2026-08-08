import { Measurement } from "../models/Measurement";
import { Report } from "../models/Report";
import { Cell, CellStatus } from "../models/Cell";
import { cellCentroid } from "../services/h3.service";
import { logger } from "../config/logger";

const LOOKBACK_DAYS = 30;

function classify(avgDownloadKbps: number, sampleCount: number, reportCount: number): CellStatus {
  if (sampleCount === 0 && reportCount >= 3) return "red";
  if (sampleCount === 0) return "red";
  if (avgDownloadKbps >= 5000) return "green";
  if (avgDownloadKbps >= 500) return "yellow";
  return "red";
}

// Recomputes every h3_r8 cell's status from the last LOOKBACK_DAYS of samples + reports.
// Run on a schedule (see server.ts) rather than per-request so map reads stay cheap.
export async function aggregateCells(): Promise<{ cellsUpdated: number }> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000);

  const measurementAgg = await Measurement.aggregate([
    { $match: { recordedAt: { $gte: since } } },
    {
      $group: {
        _id: "$h3_r8",
        h3_r7: { $first: "$h3_r7" },
        avgDownloadKbps: { $avg: "$downloadKbps" },
        avgSignalDbm: { $avg: "$signalDbm" },
        sampleCount: { $sum: 1 },
        operators: { $push: { operator: "$operator", downloadKbps: "$downloadKbps" } },
      },
    },
  ]);

  const reportCounts = await Report.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $ne: "resolved" } } },
    { $group: { _id: "$h3_r8", count: { $sum: 1 } } },
  ]);
  const reportCountByCell = new Map(reportCounts.map((r) => [r._id as string, r.count as number]));

  // Cells with reports but no measurements still need a document (likely red).
  const h3Set = new Set<string>(measurementAgg.map((m) => m._id));
  for (const key of reportCountByCell.keys()) h3Set.add(key);

  const byH3 = new Map(measurementAgg.map((m) => [m._id as string, m]));
  const ops: Promise<unknown>[] = [];

  for (const h3 of h3Set) {
    const m = byH3.get(h3);
    const reportCount = reportCountByCell.get(h3) ?? 0;
    const avgDownloadKbps = m?.avgDownloadKbps ?? 0;
    const sampleCount = m?.sampleCount ?? 0;
    const status = classify(avgDownloadKbps, sampleCount, reportCount);

    const operatorStats = m
      ? Object.values(
          (m.operators as { operator?: string; downloadKbps?: number }[]).reduce(
            (acc, o) => {
              if (!o.operator) return acc;
              const cur = acc[o.operator] ?? { operator: o.operator, total: 0, sampleCount: 0 };
              cur.total += o.downloadKbps ?? 0;
              cur.sampleCount += 1;
              acc[o.operator] = cur;
              return acc;
            },
            {} as Record<string, { operator: string; total: number; sampleCount: number }>
          )
        ).map((o) => ({ operator: o.operator, avgDownloadKbps: o.total / o.sampleCount, sampleCount: o.sampleCount }))
      : [];

    ops.push(
      Cell.findByIdAndUpdate(
        h3,
        {
          _id: h3,
          h3_r7: m?.h3_r7 ?? h3,
          centroid: { type: "Point", coordinates: cellCentroid(h3) },
          status,
          avgDownloadKbps,
          avgSignalDbm: m?.avgSignalDbm ?? null,
          sampleCount,
          reportCount,
          operatorStats,
          // Real data always wins over a prior prediction for this cell.
          predicted: false,
          confidence: 1,
          lastComputedAt: new Date(),
        },
        { upsert: true }
      )
    );
  }

  await Promise.all(ops);
  logger.info({ cellsUpdated: h3Set.size }, "cell aggregation complete");
  return { cellsUpdated: h3Set.size };
}
