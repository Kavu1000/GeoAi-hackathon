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
});

export const env = schema.parse(process.env);
