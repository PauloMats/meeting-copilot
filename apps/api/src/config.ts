import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url().optional(),
  APP_USER_EMAIL: z.string().email().default("local@meeting-copilot.invalid"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_ANSWER_MODEL: z.string().default("gpt-5.5"),
  OPENAI_REALTIME_TRANSCRIPTION_MODEL: z.string().default("gpt-realtime-whisper"),
  RETRIEVAL_PROVIDER: z.enum(["none", "openai_file_search", "pgvector"]).default("none"),
  OPENAI_VECTOR_STORE_ID: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(environment);
}
