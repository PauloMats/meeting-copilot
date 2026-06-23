import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import {
  AnswerRequestSchema,
  CreateContextProfileSchema,
  CreateGlossaryTermSchema,
  RealtimeTokenRequestSchema,
  UpdateContextProfileSchema,
  UpdateGlossaryTermSchema,
  type ContextProfile,
  type GlossaryTerm
} from "@meeting-copilot/contracts";
import { createDatabase } from "@meeting-copilot/database";
import Fastify, { type FastifyInstance } from "fastify";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { AnswerService } from "./modules/answering/service.js";
import {
  MemoryContextRepository,
  type ContextRepository
} from "./modules/context-profiles/memory-repository.js";
import { PostgresContextRepository } from "./modules/context-profiles/postgres-repository.js";
import { RealtimeTokenService } from "./modules/realtime-token/service.js";
import { NullRetrievalProvider, OpenAIFileSearchProvider } from "./modules/retrieval/providers.js";

export interface AppDependencies {
  contextRepository?: ContextRepository;
  openai?: OpenAI;
  realtimeTokenService?: RealtimeTokenService;
}

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: ["req.headers.authorization", "body.value", "body.audio"]
    },
    bodyLimit: 2 * 1024 * 1024
  });
  await app.register(cors, { origin: config.CORS_ORIGIN });
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }
  });

  const database = config.DATABASE_URL ? createDatabase(config.DATABASE_URL) : null;
  const contextRepository =
    dependencies.contextRepository ??
    (database
      ? new PostgresContextRepository(database.db, config.APP_USER_EMAIL)
      : new MemoryContextRepository());
  await contextRepository.init();
  if (database) {
    app.addHook("onClose", () => database.close());
  }
  const openai =
    dependencies.openai ??
    (config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null);
  const tokenService =
    dependencies.realtimeTokenService ??
    (config.OPENAI_API_KEY
      ? new RealtimeTokenService(config.OPENAI_API_KEY, config.OPENAI_REALTIME_TRANSCRIPTION_MODEL)
      : null);

  const retrieval =
    config.RETRIEVAL_PROVIDER === "openai_file_search" && openai && config.OPENAI_VECTOR_STORE_ID
      ? new OpenAIFileSearchProvider(
          openai,
          config.OPENAI_VECTOR_STORE_ID,
          config.OPENAI_ANSWER_MODEL
        )
      : new NullRetrievalProvider();
  const answerService = openai
    ? new AnswerService(openai, config.OPENAI_ANSWER_MODEL, contextRepository, retrieval)
    : null;

  app.get("/api/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    providers: {
      openai: Boolean(config.OPENAI_API_KEY),
      database: Boolean(config.DATABASE_URL),
      retrieval: config.RETRIEVAL_PROVIDER
    }
  }));

  app.post("/api/realtime/token", async (request, reply) => {
    if (!tokenService) return reply.code(503).send({ message: "OPENAI_API_KEY is not configured" });
    const input = RealtimeTokenRequestSchema.parse(request.body);
    return tokenService.create(input);
  });

  app.post("/api/answers", async (request, reply) => {
    if (!answerService)
      return reply.code(503).send({ message: "OPENAI_API_KEY is not configured" });
    const input = AnswerRequestSchema.parse(request.body);
    return answerService.generate(input);
  });

  app.get("/api/context-profiles", () => contextRepository.listProfiles());
  app.post("/api/context-profiles", async (request, reply) => {
    const input = CreateContextProfileSchema.parse(request.body);
    const now = new Date().toISOString();
    const profile: ContextProfile = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    return reply.code(201).send(await contextRepository.saveProfile(profile));
  });
  app.put<{ Params: { id: string } }>("/api/context-profiles/:id", async (request, reply) => {
    const existing = await contextRepository.findProfile(request.params.id);
    if (!existing) return reply.code(404).send({ message: "Context profile not found" });
    const patch = UpdateContextProfileSchema.parse(request.body);
    return contextRepository.saveProfile({
      id: existing.id,
      name: patch.name ?? existing.name,
      projectDescription: patch.projectDescription ?? existing.projectDescription,
      techStack: patch.techStack ?? existing.techStack,
      businessContext: patch.businessContext ?? existing.businessContext,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    });
  });
  app.delete<{ Params: { id: string } }>("/api/context-profiles/:id", async (request, reply) => {
    const deleted = await contextRepository.deleteProfile(request.params.id);
    return deleted ? reply.code(204).send() : reply.code(404).send({ message: "Not found" });
  });

  app.get("/api/glossary", () => contextRepository.listGlossaryTerms());
  app.post("/api/glossary", async (request, reply) => {
    const input = CreateGlossaryTermSchema.parse(request.body);
    const now = new Date().toISOString();
    const term: GlossaryTerm = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    return reply.code(201).send(await contextRepository.saveGlossaryTerm(term));
  });
  app.put<{ Params: { id: string } }>("/api/glossary/:id", async (request, reply) => {
    const terms = await contextRepository.listGlossaryTerms();
    const existing = terms.find((term) => term.id === request.params.id);
    if (!existing) return reply.code(404).send({ message: "Glossary term not found" });
    const patch = UpdateGlossaryTermSchema.parse(request.body);
    return contextRepository.saveGlossaryTerm({
      id: existing.id,
      source: patch.source ?? existing.source,
      replacement: patch.replacement ?? existing.replacement,
      kind: patch.kind ?? existing.kind,
      caseSensitive: patch.caseSensitive ?? existing.caseSensitive,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    });
  });
  app.delete<{ Params: { id: string } }>("/api/glossary/:id", async (request, reply) => {
    const deleted = await contextRepository.deleteGlossaryTerm(request.params.id);
    return deleted ? reply.code(204).send() : reply.code(404).send({ message: "Not found" });
  });

  app.post("/api/documents/upload", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ message: "A document is required" });
    await file.toBuffer();
    return reply.code(202).send({
      id: randomUUID(),
      name: file.filename,
      mimeType: file.mimetype,
      status: "uploaded",
      message: "Storage and indexing worker integration is required before production use."
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ message: "Invalid request", details: error.flatten() });
    }
    if (error instanceof Error) {
      const statusCode = "statusCode" in error ? Number(error.statusCode) : Number.NaN;
      if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
        return reply.code(statusCode).send({ message: error.message });
      }
    }
    app.log.error(error);
    return reply.code(500).send({ message: "Internal server error" });
  });

  return app;
}
