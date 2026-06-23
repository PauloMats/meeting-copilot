import { sql } from "drizzle-orm";
import {
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 160 }),
    ...timestamps
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
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
