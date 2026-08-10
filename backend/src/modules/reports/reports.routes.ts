import { Router } from "express";
import { z } from "zod";
import { Report } from "../../models/Report";
import { indexPoint } from "../../services/h3.service";
import { requireAuth, requireRole, AuthedRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";

export const reportsRouter = Router();

const createSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.string().optional(),
  signal_type: z.string().optional(),
  operator: z.string().optional(),
  province: z.string().optional(),
  comment: z.string().max(500).optional(),
});

reportsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = createSchema.parse(req.body);
    const signalType = body.signal_type || body.category || "no_signal";
    const category = body.category || body.signal_type || "no_signal";
    const { h3_r7, h3_r8 } = indexPoint(body.lat, body.lng);
    const report = await Report.create({
      userId: req.user!.id,
      location: { type: "Point", coordinates: [body.lng, body.lat] },
      h3_r7,
      h3_r8,
      category,
      signal_type: signalType,
      province: body.province,
      operator: body.operator,
      comment: body.comment,
    });
    res.status(201).json(report);
  })
);

const MAX_BBOX_DEGREES = 10;

const listSchema = z.object({
  status: z.enum(["new", "reviewed", "resolved"]).optional(),
  h3_r7: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  minLng: z.coerce.number().optional(),
  minLat: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
});

// Any signed-in user can browse reports — the public client site plots
// them as pins on its coverage map (that's the whole point of crowd-sourced
// reports). Only triage (PATCH below) is restricted to operator/admin.
reportsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.h3_r7) filter.h3_r7 = q.h3_r7;

    const hasBbox = q.minLng !== undefined && q.minLat !== undefined && q.maxLng !== undefined && q.maxLat !== undefined;
    if (hasBbox) {
      if (q.maxLng! - q.minLng! > MAX_BBOX_DEGREES || q.maxLat! - q.minLat! > MAX_BBOX_DEGREES) {
        throw new ApiError(400, "bbox_too_large");
      }
      filter.location = {
        $geoWithin: {
          $box: [
            [q.minLng, q.minLat],
            [q.maxLng, q.maxLat],
          ],
        },
      };
      const items = await Report.find(filter).sort({ createdAt: -1 }).limit(500);
      res.json({ items, total: items.length, page: 1, limit: items.length });
      return;
    }

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Report.countDocuments(filter),
    ]);
    res.json({ items, total, page: q.page, limit: q.limit });
  })
);

const patchSchema = z.object({ status: z.enum(["new", "reviewed", "resolved"]) });

reportsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (req, res) => {
    const { status } = patchSchema.parse(req.body);
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) throw new ApiError(404, "report_not_found");
    res.json(report);
  })
);
