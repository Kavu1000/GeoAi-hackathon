import cron from "node-cron";
import { Server } from "socket.io";
import { createApp } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { corsOriginHandler } from "./config/cors";
import { setIo } from "./services/realtime.service";
import { aggregateCells } from "./jobs/aggregateCells.job";
import { scoreRecommendations } from "./jobs/scoreRecommendations.job";
import { predictCoverage } from "./jobs/predictCoverage.job";
import { inferTowers } from "./jobs/inferTowers.job";
import { computeForecast } from "./jobs/computeForecast.job";

async function main() {
  await connectDb();

  const app = createApp();
  const httpServer = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "api listening"));

  // No auth on the socket — GET /cells (the same feature shape broadcast
  // here) is already fully public/unauthenticated, so there's no
  // confidentiality boundary a token would protect. CORS is still applied.
  const io = new Server(httpServer, { cors: { origin: corsOriginHandler() } });
  setIo(io);

  cron.schedule(env.AGGREGATION_CRON, async () => {
    try {
      await aggregateCells();
      await scoreRecommendations();
    } catch (err) {
      logger.error({ err }, "aggregation job failed");
    }
  });

  // Full-country prediction infill is much heavier (tens of thousands of
  // cells) and far slower-changing than real measurements, so it gets its
  // own, less frequent schedule rather than riding along on every
  // AGGREGATION_CRON tick.
  cron.schedule(env.PREDICTION_CRON, async () => {
    try {
      await predictCoverage();
      await scoreRecommendations();
    } catch (err) {
      logger.error({ err }, "prediction job failed");
    }
  });

  cron.schedule(env.TOWER_INFERENCE_CRON, async () => {
    try {
      await inferTowers();
    } catch (err) {
      logger.error({ err }, "tower inference job failed");
    }
  });

  cron.schedule(env.FORECAST_CRON, async () => {
    try {
      await computeForecast();
    } catch (err) {
      logger.error({ err }, "forecast planning job failed");
    }
  });

  // Run once on boot so the map/dashboard aren't empty until the first tick.
  aggregateCells()
    .then(() => predictCoverage())
    .then(() => scoreRecommendations())
    .then(() => inferTowers())
    .then(() => computeForecast())
    .catch((err) => logger.error({ err }, "initial aggregation failed"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
