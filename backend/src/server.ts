import cron from "node-cron";
import { createApp } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { aggregateCells } from "./jobs/aggregateCells.job";
import { scoreRecommendations } from "./jobs/scoreRecommendations.job";
import { predictCoverage } from "./jobs/predictCoverage.job";

async function main() {
  await connectDb();

  const app = createApp();
  app.listen(env.PORT, () => logger.info({ port: env.PORT }, "api listening"));

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

  // Run once on boot so the map/dashboard aren't empty until the first tick.
  aggregateCells()
    .then(() => predictCoverage())
    .then(() => scoreRecommendations())
    .catch((err) => logger.error({ err }, "initial aggregation failed"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
