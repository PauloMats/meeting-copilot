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
  DESKTOP_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_ANSWER_MODEL: z.string().default("gpt-5.4-nano"),
  OPENAI_ANSWER_MODEL_BASIC: z.string().default("gpt-5.4-nano"),
  OPENAI_ANSWER_MODEL_BALANCED: z.string().default("gpt-5.4-mini"),
  OPENAI_ANSWER_MODEL_ADVANCED: z.string().default("gpt-5.4"),
  OPENAI_ANSWER_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(160).max(2000).default(520),
  OPENAI_ANSWER_CONTEXT_CHARS: z.coerce.number().int().min(1000).max(20000).default(6000),
  OPENAI_RETRIEVAL_LIMIT: z.coerce.number().int().min(0).max(10).default(0),
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
    DESKTOP_API_KEY: config.DESKTOP_API_KEY,
    OPENAI_API_KEY: config.OPENAI_API_KEY,
    OPENAI_ANSWER_MODEL: config.OPENAI_ANSWER_MODEL,
    OPENAI_ANSWER_MODEL_BASIC: config.OPENAI_ANSWER_MODEL_BASIC,
    OPENAI_ANSWER_MODEL_BALANCED: config.OPENAI_ANSWER_MODEL_BALANCED,
    OPENAI_ANSWER_MODEL_ADVANCED: config.OPENAI_ANSWER_MODEL_ADVANCED,
    OPENAI_ANSWER_MAX_OUTPUT_TOKENS: config.OPENAI_ANSWER_MAX_OUTPUT_TOKENS,
    OPENAI_ANSWER_CONTEXT_CHARS: config.OPENAI_ANSWER_CONTEXT_CHARS,
    OPENAI_RETRIEVAL_LIMIT: config.OPENAI_RETRIEVAL_LIMIT,
    OPENAI_REALTIME_TRANSCRIPTION_MODEL: config.OPENAI_REALTIME_TRANSCRIPTION_MODEL,
    RETRIEVAL_PROVIDER: config.RETRIEVAL_PROVIDER,
    OPENAI_VECTOR_STORE_ID: config.OPENAI_VECTOR_STORE_ID,
    LOG_LEVEL: config.LOG_LEVEL,
    CORS_ORIGIN: config.CORS_ORIGIN,
    API_PORT: config.API_PORT ?? config.PORT ?? 3333
  };
}
