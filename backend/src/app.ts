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

  // Railway sits in front of this app behind its own edge network, whose
  // exact hop count isn't something we control or can rely on staying
  // fixed — `true` trusts the whole X-Forwarded-For chain and takes the
  // left-most (original client) entry, which is the standard
  // recommendation for platforms like Railway/Render/Heroku where you
  // don't know the precise proxy depth. A numeric hop count here silently
  // resolves to the wrong address if it doesn't match reality, which makes
  // an IP-keyed rate limit (see measurements/speedtest routes) either
  // bucket every user together or never trigger at all.
  app.set("trust proxy", true);

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
