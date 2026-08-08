import { Cell, CellStatus } from "../models/Cell";
import {
  laosR7Cells,
  buildMeasuredIndex,
  predictCellStatus,
  cellLatLng,
  MeasuredPoint,
} from "../services/predictionGrid.service";
import { cellCentroid } from "../services/h3.service";
import { logger } from "../config/logger";

const BATCH_SIZE = 1000;

// Rough display bandwidth per predicted status, purely so the map tooltip
// has something plausible to show — this is not a measurement, and the
// "predicted" flag + confidence score are what tell the UI (and the user)
// that it's an estimate, not ground truth.
const STATUS_KBPS_ESTIMATE: Record<CellStatus, number> = { green: 6000, yellow: 1500, red: 0 };

// MODEL step, infill half: fills in every r7 hex across Laos that doesn't
// already have real measurement/report data, using interpolation from
// nearby measured cells (falling back to the population proxy where there's
// nothing nearby to interpolate from) — see predictionGrid.service.ts for
// the actual model. Runs on its own (infrequent) schedule since the
// full-country grid is tens of thousands of cells and doesn't need
// recomputing every 15 minutes like the real-data aggregation does.
export async function predictCoverage(): Promise<{ predicted: number; skipped: number }> {
  const measuredCells = await Cell.find({ predicted: false }).select("h3_r7 centroid status").lean();

  const measuredPoints: MeasuredPoint[] = measuredCells.map((c) => ({
    lat: c.centroid.coordinates[1],
    lng: c.centroid.coordinates[0],
    status: c.status,
  }));
  const measuredR7 = new Set(measuredCells.map((c) => c.h3_r7));
  const index = buildMeasuredIndex(measuredPoints);

  const grid = laosR7Cells();
  const toPredict = grid.filter((h3) => !measuredR7.has(h3));

  // Clean up any stale predicted doc for cells that now have real coverage
  // (e.g. a measurement finally landed inside that r7 hex).
  await Cell.deleteMany({ predicted: true, _id: { $in: grid.filter((h3) => measuredR7.has(h3)) } });

  let predicted = 0;
  for (let i = 0; i < toPredict.length; i += BATCH_SIZE) {
    const batch = toPredict.slice(i, i + BATCH_SIZE);
    const ops = batch.map((h3) => {
      const [lat, lng] = cellLatLng(h3);
      const { status, confidence } = predictCellStatus(lat, lng, index);
      return {
        updateOne: {
          filter: { _id: h3 },
          update: {
            $set: {
              _id: h3,
              h3_r7: h3,
              centroid: { type: "Point" as const, coordinates: cellCentroid(h3) },
              status,
              avgDownloadKbps: STATUS_KBPS_ESTIMATE[status],
              avgSignalDbm: null,
              sampleCount: 0,
              reportCount: 0,
              operatorStats: [],
              predicted: true,
              confidence,
              lastComputedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });
    await Cell.bulkWrite(ops, { ordered: false });
    predicted += batch.length;
  }

  logger.info(
    { predicted, skipped: grid.length - toPredict.length, gridSize: grid.length },
    "coverage prediction (infill) complete"
  );
  return { predicted, skipped: grid.length - toPredict.length };
}
