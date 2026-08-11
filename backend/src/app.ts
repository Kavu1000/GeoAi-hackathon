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
import { usersRouter } from "./modules/users/users.routes";
import { towersRouter } from "./modules/towers/towers.routes";
import { forecastRouter } from "./modules/forecast/forecast.routes";
import { notFoundHandler, errorHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  // Comma-separated list so the dashboard (admin/operator) and the public
  // client site (residents/travellers) can both call this API in dev —
  // e.g. "http://localhost:5173,http://localhost:5174". A single "*" still
  // works (disables the allowlist) for anyone who hasn't split it up.
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  // Vite moves to the next port when the preferred dev port is busy. Permit
  // its usual local development range so starting the dashboard and client
  // together cannot unexpectedly break signup/login preflight requests.
  const isLocalViteOrigin = (origin: string) => {
    try {
      const url = new URL(origin);
      const port = Number(url.port);
      return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && port >= 5173 && port <= 5179;
    } catch {
      return false;
    }
  };
  app.use(helmet());
  app.use(
    cors({
      origin:
        allowedOrigins.length === 1 && allowedOrigins[0] === "*"
          ? "*"
          : (origin, callback) => {
              if (!origin || allowedOrigins.includes(origin) || isLocalViteOrigin(origin)) callback(null, true);
              else callback(new Error("not allowed by CORS"));
            },
    })
  );
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
