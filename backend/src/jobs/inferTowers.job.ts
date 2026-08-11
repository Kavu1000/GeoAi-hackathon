import { Measurement } from "../models/Measurement";
import { TowerEstimate } from "../models/TowerEstimate";
import { dbscan } from "../services/dbscan.service";
import { estimateTowerFromCluster, SignalReading } from "../services/towerInference.service";
import { logger } from "../config/logger";

// Tower Inference, Tier B: clusters crowd-sourced signal readings into
// estimated tower positions, entirely from data already collected (no
// mobile app changes — see towerInference.service.ts's header comment on
// why Tier A, Cell ID clustering, isn't built yet). No BullMQ/event-driven
// trigger exists in this stack, so this replaces it with a periodic sweep
// that's still change-aware: a (h3_r7, operator) group is only reprocessed
// once enough new samples have landed since its last compute, so most ticks
// do near-nothing.
const MIN_OBSERVATIONS = 3; // DBSCAN minPts, and the floor to consider a group at all
const MIN_NEW_SAMPLES = 5; // once a group has an estimate, wait for this many new samples before redoing it
const CLUSTER_EPS_METERS = 700; // h3_r7 edge is ~1220m — tight enough to separate two towers in one hex

interface MeasurementPoint extends SignalReading {
  h3_r8: string;
}

export async function inferTowers(): Promise<{ regionsProcessed: number; towersEstimated: number }> {
  // Different carriers have physically different towers, so grouping (and
  // every downstream cluster) is always per-operator, never blended.
  // Readings with no operator or no signal reading can't be attributed to a
  // carrier's tower and are excluded here.
  const groups = await Measurement.aggregate([
    { $match: { signalDbm: { $ne: null }, operator: { $exists: true, $ne: null } } },
    { $group: { _id: { h3_r7: "$h3_r7", operator: "$operator" }, count: { $sum: 1 } } },
    { $match: { count: { $gte: MIN_OBSERVATIONS } } },
  ]);

  const priorCounts = await TowerEstimate.aggregate([
    { $group: { _id: { h3_r7: "$h3_r7", operator: "$operator" }, n: { $max: "$measurementCountAtCompute" } } },
  ]);
  const priorMap = new Map<string, number>(
    priorCounts.map((p) => [`${p._id.h3_r7}:${p._id.operator}`, p.n as number])
  );
  const validKeys = new Set(groups.map((g) => `${g._id.h3_r7 as string}:${g._id.operator as string}`));

  // Clean up estimates for groups that no longer clear the observation
  // floor (e.g. Measurement's 90-day TTL aged their readings out) — same
  // "drop stale state" pattern predictCoverage.job.ts uses for cells that
  // gained real measurements and no longer need a prediction.
  for (const p of priorCounts) {
    const h3_r7 = p._id.h3_r7 as string;
    const operator = p._id.operator as string;
    if (!validKeys.has(`${h3_r7}:${operator}`)) {
      await TowerEstimate.deleteMany({ h3_r7, operator });
    }
  }

  let regionsProcessed = 0;
  let towersEstimated = 0;

  for (const g of groups) {
    const h3_r7 = g._id.h3_r7 as string;
    const operator = g._id.operator as string;
    const count = g.count as number;
    const prior = priorMap.get(`${h3_r7}:${operator}`) ?? 0;
    if (prior > 0 && count - prior < MIN_NEW_SAMPLES) continue; // nothing new enough to bother

    const readings = await Measurement.find({ h3_r7, operator, signalDbm: { $ne: null } })
      .select("location signalDbm h3_r8")
      .lean();

    const points: MeasurementPoint[] = readings.map((r) => ({
      lat: r.location.coordinates[1],
      lon: r.location.coordinates[0],
      signalDbm: r.signalDbm as number,
      h3_r8: r.h3_r8,
    }));

    const clusters = dbscan(points, CLUSTER_EPS_METERS, MIN_OBSERVATIONS);

    // No stable natural key for "the same individual cluster" across runs
    // (a group's cluster count can grow or shrink as density fills in) —
    // a full replace per group is simplest and correct; the skip logic
    // above already keeps this cheap by not touching unchanged groups.
    await TowerEstimate.deleteMany({ h3_r7, operator });

    for (const cluster of clusters) {
      const result = estimateTowerFromCluster(cluster);
      const regionHexes = [...new Set(cluster.map((c) => c.h3_r8))];
      await TowerEstimate.create({
        h3_r7,
        operator,
        location: { type: "Point", coordinates: [result.lon, result.lat] },
        method: "dbscan_pathloss",
        confidence: result.confidence,
        observationCount: result.observationCount,
        estimatedRadiusM: result.estimatedRadiusM,
        regionHexes,
        measurementCountAtCompute: count,
        lastUpdated: new Date(),
      });
      towersEstimated++;
    }
    regionsProcessed++;
  }

  logger.info({ regionsProcessed, towersEstimated }, "tower inference complete");
  return { regionsProcessed, towersEstimated };
}
