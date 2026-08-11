import { Measurement } from "../models/Measurement";
import { Report } from "../models/Report";
import { Cell, CellDoc, CellStatus } from "../models/Cell";
import { cellCentroid, cellPolygon } from "./h3.service";

const LOOKBACK_DAYS = 30;

interface RawSample {
  operator?: string;
  downloadKbps?: number;
  networkType?: string;
}

// Best-observed network generation per cell, worst to best. "wifi" isn't a
// cellular generation, but a wifi reading still means "this spot has decent
// connectivity" — for the coverage map's purposes it's treated as being as
// good as the top cellular tier rather than excluded outright.
const NETWORK_RANK: Record<string, number> = { none: 0, "2g": 1, "3g": 2, "4g": 3, wifi: 5, "5g": 5 };
// A 4G reading only reads as "4g_plus" once its own average throughput
// clears this bar — plain NETWORK_TYPE_LTE doesn't distinguish real 4G from
// carrier-aggregated LTE-Advanced, so this is a throughput-based proxy for
// that distinction, not a true carrier-aggregation detection.
const FOUR_G_PLUS_KBPS = 15000; // ~15 Mbps

export function classify(samples: RawSample[]): CellStatus {
  if (samples.length === 0) return "none";

  // Best-observed generation wins — a coverage map should show what's
  // achievable at a spot, not the worst reading a device happened to get.
  let bestType = "none";
  let bestRank = -1;
  for (const s of samples) {
    const type = s.networkType ?? "none";
    const rank = NETWORK_RANK[type] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestType = type;
    }
  }

  if (bestType === "none") return "none";
  if (bestType === "5g" || bestType === "wifi") return "5g";
  if (bestType === "4g") {
    const fourGSamples = samples.filter((s) => (s.networkType ?? "none") === "4g");
    const avg =
      fourGSamples.reduce((sum, s) => sum + (s.downloadKbps ?? 0), 0) / Math.max(1, fourGSamples.length);
    return avg >= FOUR_G_PLUS_KBPS ? "4g_plus" : "4g";
  }
  return bestType as CellStatus; // "2g" | "3g"
}

// A cheap snapshot of "does this cell look different from before" — every
// field a client-facing broadcast cares about. Doesn't include things like
// operatorStats or lastComputedAt, which change on every recompute
// regardless of whether anything meaningful actually happened.
function snapshot(cell: Pick<CellDoc, "status" | "avgDownloadKbps" | "avgLatencyMs" | "sampleCount" | "reportCount" | "confidence" | "predicted">) {
  return [cell.status, cell.avgDownloadKbps, cell.avgLatencyMs, cell.sampleCount, cell.reportCount, cell.confidence, cell.predicted].join("|");
}

/**
 * Recomputes h3_r8 cells from the last LOOKBACK_DAYS of samples + reports —
 * every cell with any activity when `h3Filter` is omitted (the periodic
 * cron sweep, see aggregateCells.job.ts), or just the given ids when
 * provided (the incremental recompute triggered right after a measurement
 * batch is ingested, see measurements.routes.ts).
 *
 * Returns both every cell touched (`updated`, for the existing "how many
 * cells did this run touch" count) and only the ones that actually changed
 * (`changed`, safe to broadcast) — the aggregate queries below always
 * recompute a cell's full picture from scratch, so most cells in a
 * multi-thousand-cell periodic sweep come out byte-identical to before;
 * broadcasting all of them anyway would spam every connected client with
 * no-op updates on every cron tick.
 */
export async function computeCellUpdates(h3Filter?: string[]): Promise<{ updated: CellDoc[]; changed: CellDoc[] }> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000);
  const scopeMatch = h3Filter ? { h3_r8: { $in: h3Filter } } : {};

  const measurementAgg = await Measurement.aggregate([
    { $match: { recordedAt: { $gte: since }, ...scopeMatch } },
    {
      $group: {
        _id: "$h3_r8",
        h3_r7: { $first: "$h3_r7" },
        avgDownloadKbps: { $avg: "$downloadKbps" },
        avgSignalDbm: { $avg: "$signalDbm" },
        avgLatencyMs: { $avg: "$latencyMs" },
        sampleCount: { $sum: 1 },
        samples: { $push: { operator: "$operator", downloadKbps: "$downloadKbps", networkType: "$networkType" } },
      },
    },
  ]);

  const reportCounts = await Report.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $ne: "resolved" }, ...scopeMatch } },
    { $group: { _id: "$h3_r8", count: { $sum: 1 } } },
  ]);
  const reportCountByCell = new Map(reportCounts.map((r) => [r._id as string, r.count as number]));

  // Cells with reports but no measurements still need a document (likely "none").
  const h3Set = new Set<string>(measurementAgg.map((m) => m._id));
  for (const key of reportCountByCell.keys()) h3Set.add(key);

  // Snapshot what's there today, before touching anything, so the upserts
  // below can be compared against it.
  const existing = await Cell.find({ _id: { $in: [...h3Set] } })
    .select("status avgDownloadKbps avgLatencyMs sampleCount reportCount confidence predicted")
    .lean();
  const priorSnapshots = new Map(existing.map((c) => [c._id, snapshot(c)]));

  const byH3 = new Map(measurementAgg.map((m) => [m._id as string, m]));
  const updated: CellDoc[] = [];
  const changed: CellDoc[] = [];

  for (const h3 of h3Set) {
    const m = byH3.get(h3);
    const reportCount = reportCountByCell.get(h3) ?? 0;
    const avgDownloadKbps = m?.avgDownloadKbps ?? 0;
    const sampleCount = m?.sampleCount ?? 0;
    const samples = (m?.samples as RawSample[] | undefined) ?? [];
    const status = classify(samples);

    // Per-operator status, not just the cell's overall blended one — a cell
    // with great Unitel coverage and no Tplus coverage shouldn't show
    // Unitel's numbers when someone filters the map down to Tplus.
    const samplesByOperator = samples.reduce(
      (acc, s) => {
        if (!s.operator) return acc;
        (acc[s.operator] ??= []).push(s);
        return acc;
      },
      {} as Record<string, RawSample[]>
    );
    const operatorStats = Object.entries(samplesByOperator).map(([operator, opSamples]) => ({
      operator,
      avgDownloadKbps: opSamples.reduce((sum, s) => sum + (s.downloadKbps ?? 0), 0) / opSamples.length,
      sampleCount: opSamples.length,
      status: classify(opSamples),
    }));

    const cell = await Cell.findByIdAndUpdate(
      h3,
      {
        _id: h3,
        h3_r7: m?.h3_r7 ?? h3,
        centroid: { type: "Point", coordinates: cellCentroid(h3) },
        status,
        avgDownloadKbps,
        avgSignalDbm: m?.avgSignalDbm ?? null,
        avgLatencyMs: m?.avgLatencyMs ?? null,
        sampleCount,
        reportCount,
        operatorStats,
        // Real data always wins over a prior prediction for this cell.
        predicted: false,
        confidence: 1,
        lastComputedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    if (!cell) continue; // upsert always returns a doc with new:true; guard only for TS's benefit

    updated.push(cell);
    if (snapshot(cell) !== priorSnapshots.get(h3)) changed.push(cell);
  }

  return { updated, changed };
}

export function cellDocToFeature(cell: CellDoc) {
  return {
    type: "Feature" as const,
    properties: {
      h3: cell._id,
      status: cell.status,
      avgDownloadKbps: cell.avgDownloadKbps,
      avgLatencyMs: cell.avgLatencyMs,
      sampleCount: cell.sampleCount,
      reportCount: cell.reportCount,
      predicted: cell.predicted,
      confidence: cell.confidence,
    },
    geometry: { type: "Polygon" as const, coordinates: [cellPolygon(cell._id)] },
  };
}
