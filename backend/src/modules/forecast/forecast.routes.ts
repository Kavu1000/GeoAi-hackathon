import { Router } from "express";
import { z } from "zod";
import { Forecast, ForecastDoc } from "../../models/Forecast";
import { computeForecast } from "../../jobs/computeForecast.job";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

export const forecastRouter = Router();

const listQuerySchema = z.object({
  horizon: z.enum(["now", "1y", "3y"]).default("now"),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

const SCORE_FIELD: Record<"now" | "1y" | "3y", keyof ForecastDoc> = {
  now: "gapScoreNow",
  "1y": "gapScore1y",
  "3y": "gapScore3y",
};

forecastRouter.get(
  "/",
  requireAuth,
  requireRole("operator", "admin"),
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const field = SCORE_FIELD[q.horizon];
    const docs = await Forecast.find()
      .sort({ [field]: -1 })
      .limit(q.limit)
      .lean();
    const items = docs.map((d, i) => ({ ...d, rank: i + 1, score: d[field] as number }));
    res.json({ items, horizon: q.horizon });
  })
);

forecastRouter.post(
  "/recompute",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const result = await computeForecast();
    res.json(result);
  })
);
