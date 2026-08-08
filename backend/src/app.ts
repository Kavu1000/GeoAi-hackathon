import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { authRouter } from "./modules/auth/auth.routes";
import { measurementsRouter } from "./modules/measurements/measurements.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { cellsRouter } from "./modules/cells/cells.routes";
import { recommendationsRouter } from "./modules/recommendations/recommendations.routes";
import { statsRouter } from "./modules/stats/stats.routes";
import { speedtestRouter } from "./modules/speedtest/speedtest.routes";
import { notFoundHandler, errorHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/measurements", measurementsRouter);
  app.use("/reports", reportsRouter);
  app.use("/cells", cellsRouter);
  app.use("/recommendations", recommendationsRouter);
  app.use("/stats", statsRouter);
  app.use("/speedtest", speedtestRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
