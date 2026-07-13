import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return value;
}, z.boolean().optional());

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
  AUTH_REQUIRED: optionalBoolean,
  AUTH_TOKEN_PEPPER: optionalNonEmptyString,
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:5173"),
  STRIPE_SECRET_KEY: optionalNonEmptyString,
  STRIPE_WEBHOOK_SECRET: optionalNonEmptyString,
  STRIPE_PRICE_BASIC: optionalNonEmptyString,
  STRIPE_PRICE_PRO: optionalNonEmptyString,
  STRIPE_PRICE_ADVANCED: optionalNonEmptyString,
  STRIPE_LIVE_MODE_ENABLED: optionalBoolean,
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
  AUTH_REQUIRED: boolean;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = ConfigSchema.parse(environment);
  if (config.STRIPE_SECRET_KEY?.startsWith("sk_live_") && !config.STRIPE_LIVE_MODE_ENABLED) {
    throw new Error(
      "A live Stripe key was rejected. Explicit production approval and STRIPE_LIVE_MODE_ENABLED=true are required."
    );
  }
  const isRailway = Boolean(
    environment.RAILWAY_ENVIRONMENT ||
    environment.RAILWAY_PROJECT_ID ||
    environment.RAILWAY_SERVICE_ID
  );
  return {
    NODE_ENV: config.NODE_ENV,
    API_HOST: isRailway ? "0.0.0.0" : config.API_HOST,
    DATABASE_URL: config.DATABASE_URL,
    APP_USER_EMAIL: config.APP_USER_EMAIL,
    AUTH_REQUIRED: config.AUTH_REQUIRED ?? config.NODE_ENV === "production",
    AUTH_TOKEN_PEPPER: config.AUTH_TOKEN_PEPPER,
    PUBLIC_WEB_URL: config.PUBLIC_WEB_URL,
    STRIPE_SECRET_KEY: config.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: config.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_BASIC: config.STRIPE_PRICE_BASIC,
    STRIPE_PRICE_PRO: config.STRIPE_PRICE_PRO,
    STRIPE_PRICE_ADVANCED: config.STRIPE_PRICE_ADVANCED,
    STRIPE_LIVE_MODE_ENABLED: config.STRIPE_LIVE_MODE_ENABLED,
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
    API_PORT: isRailway
      ? (config.PORT ?? config.API_PORT ?? 3333)
      : (config.API_PORT ?? config.PORT ?? 3333)
  };
}
