import { config as loadEnvironment } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";
import { createDatabase } from "./client.js";

loadEnvironment({
  path: process.env.MEETING_COPILOT_ENV_FILE ?? resolve(import.meta.dirname, "../../../.env")
});

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const database = createDatabase(connectionString);

try {
  await migrate(database.db, { migrationsFolder: "./drizzle" });
} finally {
  await database.close();
}
