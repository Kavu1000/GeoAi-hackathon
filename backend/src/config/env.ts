import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("*"),
  AGGREGATION_CRON: z.string().default("*/15 * * * *"),
  // Full-country coverage prediction (MODEL step infill) is a heavier,
  // slower-changing job than the 15-min real-data aggregation — runs once a
  // day by default. See jobs/predictCoverage.job.ts.
  PREDICTION_CRON: z.string().default("0 3 * * *"),
  // Tower inference (Tier B — spatial clustering) is heavier than the
  // 15-min aggregation but changes faster than daily prediction infill;
  // sweeps for (region, operator) groups with enough new samples every
  // 30 min rather than recomputing everything. See jobs/inferTowers.job.ts.
  TOWER_INFERENCE_CRON: z.string().default("*/30 * * * *"),
  // Population growth is slow-moving; recompute weekly rather than on the
  // 15-min aggregation cron, same reasoning as PREDICTION_CRON. See
  // jobs/computeForecast.job.ts.
  FORECAST_CRON: z.string().default("0 4 * * 0"),
  // AI-assisted recommendation reasoning (MODEL step). Optional — scoring
  // falls back to the plain formula if unset. Get a key at openrouter.ai.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("deepseek/deepseek-r1"),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
});

export const env = schema.parse(process.env);
