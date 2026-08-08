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
  category: z.enum(["no_signal", "slow", "outage"]),
  operator: z.string().optional(),
  comment: z.string().max(500).optional(),
});

reportsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = createSchema.parse(req.body);
    const { h3_r7, h3_r8 } = indexPoint(body.lat, body.lng);
    const report = await Report.create({
      userId: req.user!.id,
      location: { type: "Point", coordinates: [body.lng, body.lat] },
      h3_r7,
      h3_r8,
      category: body.category,
      operator: body.operator,
      comment: body.comment,
    });
    res.status(201).json(report);
  })
);

const listSchema = z.object({
  status: z.enum(["new", "reviewed", "resolved"]).optional(),
  h3_r7: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// Dashboard-only: browse and triage reports.
reportsRouter.get(
  "/",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.h3_r7) filter.h3_r7 = q.h3_r7;
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
