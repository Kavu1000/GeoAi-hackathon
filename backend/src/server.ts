import cron from "node-cron";
import { createApp } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { aggregateCells } from "./jobs/aggregateCells.job";
import { scoreRecommendations } from "./jobs/scoreRecommendations.job";

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

  // Run once on boot so the map/dashboard aren't empty until the first tick.
  aggregateCells()
    .then(() => scoreRecommendations())
    .catch((err) => logger.error({ err }, "initial aggregation failed"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
