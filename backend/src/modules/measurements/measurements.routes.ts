import { Router } from "express";
import { z } from "zod";
import { Measurement } from "../../models/Measurement";
import { indexPoint } from "../../services/h3.service";
import { requireAuth, AuthedRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const measurementsRouter = Router();

const sampleSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  operator: z.string().optional(),
  networkType: z.enum(["none", "2g", "3g", "4g", "5g", "wifi"]),
  signalDbm: z.number().optional(),
  latencyMs: z.number().nonnegative().optional(),
  downloadKbps: z.number().nonnegative().optional(),
  uploadKbps: z.number().nonnegative().optional(),
  // "recording" = a sample taken during an active Record-screen session
  // (see mobile's features/record) — same shape as "auto", just tagged
  // separately so it's distinguishable in analytics from the 15-min
  // passive background task.
  source: z.enum(["auto", "speedtest", "recording"]).default("auto"),
  recordedAt: z.coerce.date(),
});

const batchSchema = z.object({ samples: z.array(sampleSchema).min(1).max(200) });

measurementsRouter.post(
  "/batch",
  requireAuth,
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
        latencyMs: s.latencyMs,
        downloadKbps: s.downloadKbps,
        uploadKbps: s.uploadKbps,
        source: s.source,
        recordedAt: s.recordedAt,
      };
    });
    const inserted = await Measurement.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: inserted.length });
  })
);
