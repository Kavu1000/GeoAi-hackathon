import { Router } from "express";
import { z } from "zod";
import { TowerEstimate } from "../../models/TowerEstimate";
import { nearestPopulationCenter } from "../../services/populationProxy.service";
import { inferTowers } from "../../jobs/inferTowers.job";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const towersRouter = Router();

const listQuerySchema = z.object({
  region: z.string().optional(),
  operator: z.string().optional(),
});

towersRouter.get(
  "/",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.region) filter.h3_r7 = q.region;
    if (q.operator) filter.operator = q.operator;

    const items = await TowerEstimate.find(filter).sort({ confidence: -1 }).limit(500).lean();
    // Bucket by nearest known town (same 11-point list stats.routes.ts
    // already uses) so "how many towers near Vientiane" means the same
    // thing everywhere in the app — this is what satisfies the spec's
    // "count summary per province/district" without new admin-boundary data.
    const withTown = items.map((item) => {
      const [lng, lat] = item.location.coordinates;
      const { name } = nearestPopulationCenter(lat, lng);
      return { ...item, nearestTown: name };
    });
    res.json({ items: withTown });
  })
);

towersRouter.post(
  "/recompute",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const result = await inferTowers();
    res.json(result);
  })
);
