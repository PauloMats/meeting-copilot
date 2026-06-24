import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().optional(),
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional()
  ),
  APP_USER_EMAIL: z.string().email().default("local@meeting-copilot.invalid"),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_ANSWER_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_REALTIME_TRANSCRIPTION_MODEL: z.string().default("gpt-realtime-whisper"),
  RETRIEVAL_PROVIDER: z.enum(["none", "openai_file_search", "pgvector"]).default("none"),
  OPENAI_VECTOR_STORE_ID: optionalNonEmptyString,
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
});

export type AppConfig = Omit<z.infer<typeof ConfigSchema>, "PORT" | "API_PORT"> & {
  API_PORT: number;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = ConfigSchema.parse(environment);
  return {
    NODE_ENV: config.NODE_ENV,
    API_HOST: config.API_HOST,
    DATABASE_URL: config.DATABASE_URL,
    APP_USER_EMAIL: config.APP_USER_EMAIL,
    OPENAI_API_KEY: config.OPENAI_API_KEY,
    OPENAI_ANSWER_MODEL: config.OPENAI_ANSWER_MODEL,
    OPENAI_REALTIME_TRANSCRIPTION_MODEL: config.OPENAI_REALTIME_TRANSCRIPTION_MODEL,
    RETRIEVAL_PROVIDER: config.RETRIEVAL_PROVIDER,
    OPENAI_VECTOR_STORE_ID: config.OPENAI_VECTOR_STORE_ID,
    LOG_LEVEL: config.LOG_LEVEL,
    CORS_ORIGIN: config.CORS_ORIGIN,
    API_PORT: config.API_PORT ?? config.PORT ?? 3333
  };
}
