import { Router } from "express";
import { z } from "zod";
import { Recommendation } from "../../models/Recommendation";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";

export const recommendationsRouter = Router();

recommendationsRouter.get(
  "/",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (_req, res) => {
    const items = await Recommendation.find().sort({ rank: 1 }).limit(200).lean();
    res.json({ items });
  })
);

const patchSchema = z.object({ status: z.enum(["proposed", "accepted", "built"]) });

recommendationsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (req, res) => {
    const { status } = patchSchema.parse(req.body);
    const rec = await Recommendation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rec) throw new ApiError(404, "recommendation_not_found");
    res.json(rec);
  })
);
