import mongoose from "mongoose";
import { logger } from "./logger";
import { env } from "./env";

function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  logger.info({ uri: redact(env.MONGO_URI) }, "mongodb connected");
}
