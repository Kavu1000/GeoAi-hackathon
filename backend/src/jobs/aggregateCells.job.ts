import { computeCellUpdates, cellDocToFeature } from "../services/cellAggregation.service";
import { emitHexUpdated } from "../services/realtime.service";
import { logger } from "../config/logger";

// Recomputes every h3_r8 cell's status from the last 30 days of samples +
// reports. Run on a schedule (see server.ts) rather than per-request so map
// reads stay cheap. The actual aggregation logic lives in
// cellAggregation.service.ts, shared with the incremental recompute
// measurements.routes.ts triggers right after a batch is ingested — this
// job is just the periodic full sweep over that same logic, broadcasting
// whatever it finds actually changed.
export async function aggregateCells(): Promise<{ cellsUpdated: number }> {
  const { updated, changed } = await computeCellUpdates();
  for (const cell of changed) emitHexUpdated(cellDocToFeature(cell));
  logger.info({ cellsUpdated: updated.length, changed: changed.length }, "cell aggregation complete");
  return { cellsUpdated: updated.length };
}
