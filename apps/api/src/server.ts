import { config as loadEnvironment } from "dotenv";
import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

loadEnvironment({
  path: process.env.MEETING_COPILOT_ENV_FILE ?? resolve(import.meta.dirname, "../../../.env")
});

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: config.API_HOST, port: config.API_PORT });
