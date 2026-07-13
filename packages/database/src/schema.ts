import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const glossaryKind = pgEnum("glossary_kind", [
  "acronym",
  "project",
  "vendor",
  "codeword",
  "synonym"
]);
export const turnStatus = pgEnum("turn_status", ["streaming", "final", "cancelled", "failed"]);
export const confidence = pgEnum("confidence", ["high", "medium", "low"]);
export const documentStatus = pgEnum("document_status", [
  "uploaded",
  "indexing",
  "ready",
  "failed"
]);
export const planCode = pgEnum("plan_code", ["trial", "basic", "pro", "advanced"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused"
]);
export const tokenStatus = pgEnum("token_status", ["active", "rotated", "revoked"]);
export const deviceAuthorizationStatus = pgEnum("device_authorization_status", [
  "pending",
  "approved",
  "consumed",
  "denied",
  "expired"
]);
export const usageFeature = pgEnum("usage_feature", [
  "transcription",
  "answer",
  "retrieval",
  "storage"
]);
export const usageStatus = pgEnum("usage_status", ["reserved", "settled", "released", "failed"]);
export const ledgerEntryType = pgEnum("ledger_entry_type", [
  "grant",
  "reservation",
  "settlement",
  "release",
  "expiry",
  "refund",
  "adjustment"
]);
export const billingEventStatus = pgEnum("billing_event_status", [
  "processing",
  "processed",
  "failed",
  "ignored"
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 160 }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const userCredentials = pgTable("user_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  ...timestamps
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    platform: varchar("platform", { length: 80 }).notNull(),
    fingerprintHash: varchar("fingerprint_hash", { length: 128 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [index("devices_user_idx").on(table.userId)]
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "cascade" }),
    accessTokenHash: varchar("access_token_hash", { length: 128 }).notNull(),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("user_sessions_access_token_idx").on(table.accessTokenHash),
    index("user_sessions_user_idx").on(table.userId),
    index("user_sessions_device_idx").on(table.deviceId)
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    status: tokenStatus("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rotatedToId: uuid("rotated_to_id"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_idx").on(table.tokenHash),
    index("refresh_tokens_family_idx").on(table.familyId),
    index("refresh_tokens_session_idx").on(table.sessionId)
  ]
);

export const emailActionTokens = pgTable(
  "email_action_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 40 }).notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("email_action_tokens_hash_idx").on(table.tokenHash),
    index("email_action_tokens_user_purpose_idx").on(table.userId, table.purpose)
  ]
);

export const deviceAuthorizations = pgTable(
  "device_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceCodeHash: varchar("device_code_hash", { length: 128 }).notNull(),
    userCodeHash: varchar("user_code_hash", { length: 128 }).notNull(),
    deviceName: varchar("device_name", { length: 160 }).notNull(),
    platform: varchar("platform", { length: 80 }).notNull(),
    status: deviceAuthorizationStatus("status").notNull().default("pending"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("device_authorizations_device_code_idx").on(table.deviceCodeHash),
    uniqueIndex("device_authorizations_user_code_idx").on(table.userCodeHash),
    index("device_authorizations_expiry_idx").on(table.expiresAt)
  ]
);

export const plans = pgTable("plans", {
  code: planCode("code").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  active: boolean("active").notNull().default(true),
  entitlements: jsonb("entitlements").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
});

export const stripeCustomers = pgTable(
  "stripe_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 100 }).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("stripe_customers_user_idx").on(table.userId),
    uniqueIndex("stripe_customers_provider_idx").on(table.stripeCustomerId)
  ]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planCode: planCode("plan_code")
      .notNull()
      .references(() => plans.code),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }).notNull(),
    stripePriceId: varchar("stripe_price_id", { length: 100 }).notNull(),
    status: subscriptionStatus("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true }).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("subscriptions_provider_idx").on(table.stripeSubscriptionId),
    index("subscriptions_user_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status)
  ]
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: usageFeature("feature").notNull(),
    status: usageStatus("status").notNull().default("reserved"),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    providerRequestId: varchar("provider_request_id", { length: 200 }),
    model: varchar("model", { length: 100 }),
    audioSeconds: integer("audio_seconds"),
    inputTokens: integer("input_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),
    outputTokens: integer("output_tokens"),
    reservedMicrocredits: bigint("reserved_microcredits", { mode: "number" }).notNull().default(0),
    settledMicrocredits: bigint("settled_microcredits", { mode: "number" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps
  },
  (table) => [
    uniqueIndex("usage_records_user_idempotency_idx").on(table.userId, table.idempotencyKey),
    index("usage_records_user_time_idx").on(table.userId, table.occurredAt)
  ]
);

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageRecordId: uuid("usage_record_id").references(() => usageRecords.id, {
      onDelete: "set null"
    }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null"
    }),
    entryType: ledgerEntryType("entry_type").notNull(),
    amountMicrocredits: bigint("amount_microcredits", { mode: "number" }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 240 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("credit_ledger_idempotency_idx").on(table.idempotencyKey),
    index("credit_ledger_user_time_idx").on(table.userId, table.effectiveAt)
  ]
);

export const billingEvents = pgTable(
  "billing_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: varchar("stripe_event_id", { length: 100 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    status: billingEventStatus("status").notNull().default("processing"),
    providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(1),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("billing_events_provider_idx").on(table.stripeEventId),
    index("billing_events_status_idx").on(table.status)
  ]
);

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hotkey: varchar("hotkey", { length: 100 }).notNull().default("Space"),
  includeMicrophone: boolean("include_microphone").notNull().default(false),
  autoSubmit: boolean("auto_submit").notNull().default(true),
  doNotSaveAudio: boolean("do_not_save_audio").notNull().default(true),
  transcriptRetentionDays: integer("transcript_retention_days").notNull().default(30),
  audioRetentionDays: integer("audio_retention_days").notNull().default(0),
  transcriptionDelay: varchar("transcription_delay", { length: 20 }).notNull().default("low"),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  overlayEnabled: boolean("overlay_enabled").notNull().default(false),
  selectedContextProfileId: uuid("selected_context_profile_id"),
  ...timestamps
});

export const contextProfiles = pgTable(
  "context_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    projectDescription: text("project_description").notNull().default(""),
    techStack: jsonb("tech_stack").$type<string[]>().notNull().default([]),
    businessContext: text("business_context").notNull().default(""),
    ...timestamps
  },
  (table) => [index("context_profiles_user_idx").on(table.userId)]
);

export const glossaryTerms = pgTable(
  "glossary_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 200 }).notNull(),
    replacement: varchar("replacement", { length: 500 }).notNull(),
    kind: glossaryKind("kind").notNull(),
    caseSensitive: boolean("case_sensitive").notNull().default(false),
    ...timestamps
  },
  (table) => [index("glossary_terms_user_idx").on(table.userId)]
);

export const meetingSessions = pgTable("meeting_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }),
  contextProfileId: uuid("context_profile_id").references(() => contextProfiles.id, {
    onDelete: "set null"
  }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps
});

export const meetingTurns = pgTable(
  "meeting_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => meetingSessions.id, { onDelete: "cascade" }),
    providerItemId: varchar("provider_item_id", { length: 200 }),
    sequence: integer("sequence").notNull(),
    status: turnStatus("status").notNull().default("streaming"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [uniqueIndex("meeting_turns_session_sequence_idx").on(table.sessionId, table.sequence)]
);

export const transcriptsRaw = pgTable("transcripts_raw", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id")
    .notNull()
    .references(() => meetingTurns.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  language: varchar("language", { length: 10 }),
  providerMetadata: jsonb("provider_metadata").$type<Record<string, unknown>>().default({}),
  ...timestamps
});

export const transcriptsNormalized = pgTable("transcripts_normalized", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id")
    .notNull()
    .references(() => meetingTurns.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  replacements: jsonb("replacements")
    .$type<Array<{ source: string; replacement: string }>>()
    .default([]),
  ...timestamps
});

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id")
    .notNull()
    .references(() => meetingTurns.id, { onDelete: "cascade" }),
  directAnswer: text("direct_answer").notNull(),
  detailedExplanation: text("detailed_explanation").notNull(),
  example: text("example").notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
  followUpQuestions: jsonb("follow_up_questions").$type<string[]>().notNull().default([]),
  confidence: confidence("confidence").notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  latencyMs: integer("latency_ms"),
  ...timestamps
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contextProfileId: uuid("context_profile_id").references(() => contextProfiles.id, {
    onDelete: "set null"
  }),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  providerFileId: varchar("provider_file_id", { length: 200 }),
  status: documentStatus("status").notNull().default("uploaded"),
  ...timestamps
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    ...timestamps
  },
  (table) => [
    uniqueIndex("document_chunks_document_index_idx").on(table.documentId, table.chunkIndex),
    index("document_chunks_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 })
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 160 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipHash: varchar("ip_hash", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("audit_events_created_at_idx").on(table.createdAt)]
);

export const schemaBootstrap = sql`
  CREATE EXTENSION IF NOT EXISTS vector;
`;
