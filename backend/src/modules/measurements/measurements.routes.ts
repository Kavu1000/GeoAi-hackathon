import { Router } from "express";
import { z } from "zod";
import { Measurement } from "../../models/Measurement";
import { indexPoint } from "../../services/h3.service";
import { isInLaos } from "../../services/geoBounds.service";
import { computeCellUpdates, cellDocToFeature } from "../../services/cellAggregation.service";
import { emitHexUpdated } from "../../services/realtime.service";
import { requireAuth, AuthedRequest } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/asyncHandler";
import { logger } from "../../config/logger";

export const measurementsRouter = Router();

// A fix more than this far off (meters) is treated as too unreliable to
// trust a hex assignment from — same spirit as the Laos bbox check below,
// catching an obviously-bad GPS read before it skews a cell's aggregate.
const MAX_ACCURACY_M = 500;

const sampleSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    operator: z.string().optional(),
    networkType: z.enum(["none", "2g", "3g", "4g", "5g", "wifi"]),
    signalDbm: z.number().optional(),
    /** GPS accuracy radius in meters — optional since not every caller reports one yet (e.g. mobile). */
    accuracyM: z.number().nonnegative().optional(),
    latencyMs: z.number().nonnegative().optional(),
    downloadKbps: z.number().nonnegative().optional(),
    uploadKbps: z.number().nonnegative().optional(),
    // "recording" = a sample taken during an active Record-screen session
    // (see mobile's features/record) — same shape as "auto", just tagged
    // separately so it's distinguishable in analytics from the 15-min
    // passive background task.
    source: z.enum(["auto", "speedtest", "recording"]).default("auto"),
    recordedAt: z.coerce.date(),
  })
  .refine((s) => isInLaos(s.lat, s.lng), { message: "coordinates_outside_laos" })
  .refine((s) => s.accuracyM === undefined || s.accuracyM <= MAX_ACCURACY_M, { message: "gps_accuracy_too_low" });

// All-or-nothing per batch: one bad sample throws a 400 for the whole
// request (via z.array(...).parse()), not the per-doc fault tolerance
// insertMany(..., {ordered:false}) has further down — a deliberate
// simplification, and a plausible signal something's wrong with the whole
// submission rather than just one reading in it.
const batchSchema = z.object({ samples: z.array(sampleSchema).min(1).max(200) });

measurementsRouter.post(
  "/batch",
  requireAuth,
  // Generous, not tight: mobile's SyncEngine can fire several back-to-back
  // batch POSTs while draining a backlog after coming back online, and
  // treats any 4xx (including 429) as a permanent rejection — it deletes
  // the chunk from the offline outbox. This threshold exists to bound
  // abuse, not to throttle legitimate catch-up syncs.
  rateLimit({ windowMs: 60_000, max: 30, keyFn: (req) => (req as AuthedRequest).user!.id }),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { samples } = batchSchema.parse(req.body);
    const docs = samples.map((s) => {
      const { h3_r7, h3_r8 } = indexPoint(s.lat, s.lng);
      return {
        userId: req.user!.id,
        location: { type: "Point" as const, coordinates: [s.lng, s.lat] as [number, number] },
        h3_r7,
        h3_r8,
        operator: s.operator,
        networkType: s.networkType,
        signalDbm: s.signalDbm,
        accuracyM: s.accuracyM,
        latencyMs: s.latencyMs,
        downloadKbps: s.downloadKbps,
        uploadKbps: s.uploadKbps,
        source: s.source,
        recordedAt: s.recordedAt,
      };
    });
    const inserted = await Measurement.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: inserted.length });

    // Live-update push: recompute just the hexes this batch touched (not
    // the whole map) and broadcast whatever actually changed. Fire-and-
    // forget, after the response is already sent — this must never delay
    // the client's POST, and asyncHandler's error wrapping doesn't apply to
    // a detached promise anyway, so errors are caught and logged locally.
    const touchedH3 = [...new Set(docs.map((d) => d.h3_r8))];
    computeCellUpdates(touchedH3)
      .then(({ changed }) => {
        for (const cell of changed) emitHexUpdated(cellDocToFeature(cell));
      })
      .catch((err) => logger.error({ err }, "incremental cell recompute failed"));
  })
);

const listSchema = z.object({
  source: z.enum(["auto", "speedtest", "recording"]).optional(),
  h3_r7: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// Mirrors reports.routes.ts's GET / (same permission model — any signed-in
// dashboard user can browse, no per-operator scoping in this app). Lets the
// dashboard's Reports page show raw mobile-app measurement records
// (Record-screen sessions, speed tests, the 15-min passive background
// task) alongside user-submitted Reports, since until now the only way to
// see this data was indirectly, aggregated into the map's Cell polygons.
measurementsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.source) filter.source = q.source;
    if (q.h3_r7) filter.h3_r7 = q.h3_r7;

    const [items, total] = await Promise.all([
      Measurement.find(filter)
        .sort({ recordedAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Measurement.countDocuments(filter),
    ]);
    res.json({ items, total, page: q.page, limit: q.limit });
  })
);
