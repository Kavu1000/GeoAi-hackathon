import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { corsOriginHandler } from "./config/cors";
import { authRouter } from "./modules/auth/auth.routes";
import { measurementsRouter } from "./modules/measurements/measurements.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { cellsRouter } from "./modules/cells/cells.routes";
import { recommendationsRouter } from "./modules/recommendations/recommendations.routes";
import { statsRouter } from "./modules/stats/stats.routes";
import { speedtestRouter } from "./modules/speedtest/speedtest.routes";
import { usersRouter } from "./modules/users/users.routes";
import { towersRouter } from "./modules/towers/towers.routes";
import { forecastRouter } from "./modules/forecast/forecast.routes";
import { notFoundHandler, errorHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  // Railway sits in front of this app as a reverse proxy — without this,
  // req.ip resolves to the proxy's address for every request, which would
  // make an IP-keyed rate limit (see measurements/speedtest routes) either
  // bucket every user together or do nothing useful.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: corsOriginHandler() }));
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
  app.use("/users", usersRouter);
  app.use("/towers", towersRouter);
  app.use("/forecast", forecastRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
