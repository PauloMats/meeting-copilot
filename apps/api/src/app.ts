import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import {
  AnswerRequestSchema,
  CheckoutRequestSchema,
  CreateContextProfileSchema,
  CreateGlossaryTermSchema,
  DeviceAuthorizationApproveSchema,
  DeviceAuthorizationPollSchema,
  DeviceAuthorizationStartSchema,
  LoginRequestSchema,
  RealtimeTokenRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  TranscriptionUsageReportSchema,
  UpdateContextProfileSchema,
  UpdateGlossaryTermSchema,
  type ContextProfile,
  type GlossaryTerm
} from "@meeting-copilot/contracts";
import { createDatabase } from "@meeting-copilot/database";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { OpenAI } from "openai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { AnswerService } from "./modules/answering/service.js";
import { AuthError, AuthService, type AuthenticatedUser } from "./modules/auth/service.js";
import { DeviceAuthorizationService } from "./modules/auth/device-service.js";
import { BillingService } from "./modules/billing/service.js";
import { PLAN_CATALOG } from "./modules/entitlements/catalog.js";
import {
  MemoryContextRepository,
  type ContextRepository
} from "./modules/context-profiles/memory-repository.js";
import { PostgresContextRepository } from "./modules/context-profiles/postgres-repository.js";
import { RealtimeTokenService } from "./modules/realtime-token/service.js";
import { NullRetrievalProvider, OpenAIFileSearchProvider } from "./modules/retrieval/providers.js";
import { UsageService } from "./modules/usage/service.js";

export interface AppDependencies {
  contextRepository?: ContextRepository;
  openai?: OpenAI;
  realtimeTokenService?: RealtimeTokenService;
  authService?: AuthService;
}

type RequestWithAuth = FastifyRequest & {
  auth?: AuthenticatedUser;
};

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies = {}
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-meeting-copilot-key",
        "body.password",
        "body.refreshToken",
        "body.deviceCode",
        "body.value",
        "body.audio",
        "body.transcript"
      ]
    },
    bodyLimit: 2 * 1024 * 1024
  });
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    if (request.url === "/api/billing/webhooks/stripe") return done(null, body);
    try {
      done(null, JSON.parse(body.toString("utf8")) as unknown);
    } catch (error) {
      done(error as Error, undefined);
    }
  });
  const allowedOrigins = config.CORS_ORIGIN.split(",").map((origin) => origin.trim());
  await app.register(cors, { origin: allowedOrigins, credentials: true });
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    allowList: (request) =>
      request.url === "/api/health" || request.url === "/api/billing/webhooks/stripe"
  });
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }
  });
  app.addHook("preHandler", async (request, reply) => {
    if (
      !config.DESKTOP_API_KEY ||
      request.url === "/api/health" ||
      request.url === "/api/plans" ||
      request.url === "/api/billing/webhooks/stripe" ||
      request.url.startsWith("/api/auth/")
    )
      return;
    if (request.headers["x-meeting-copilot-key"] !== config.DESKTOP_API_KEY) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  const database = config.DATABASE_URL ? createDatabase(config.DATABASE_URL) : null;
  if (config.AUTH_REQUIRED && !database) {
    throw new Error("DATABASE_URL is required when AUTH_REQUIRED=true");
  }
  if (config.AUTH_REQUIRED && !config.AUTH_TOKEN_PEPPER) {
    throw new Error("AUTH_TOKEN_PEPPER is required when AUTH_REQUIRED=true");
  }
  const authService =
    dependencies.authService ??
    (database && config.AUTH_TOKEN_PEPPER
      ? new AuthService(database.db, config.AUTH_TOKEN_PEPPER)
      : null);
  const usageService = database ? new UsageService(database.db) : null;
  const deviceAuthorizationService =
    database && authService && config.AUTH_TOKEN_PEPPER
      ? new DeviceAuthorizationService(
          database.db,
          authService,
          config.AUTH_TOKEN_PEPPER,
          new URL("/device", config.PUBLIC_WEB_URL).toString()
        )
      : null;
  const billingService =
    database && config.STRIPE_SECRET_KEY
      ? new BillingService(
          database.db,
          config.STRIPE_SECRET_KEY,
          config.STRIPE_WEBHOOK_SECRET,
          {
            basic: config.STRIPE_PRICE_BASIC,
            pro: config.STRIPE_PRICE_PRO,
            advanced: config.STRIPE_PRICE_ADVANCED
          },
          config.PUBLIC_WEB_URL
        )
      : null;
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
    ? new AnswerService(
        openai,
        {
          basic: config.OPENAI_ANSWER_MODEL_BASIC || config.OPENAI_ANSWER_MODEL,
          balanced: config.OPENAI_ANSWER_MODEL_BALANCED,
          advanced: config.OPENAI_ANSWER_MODEL_ADVANCED
        },
        contextRepository,
        retrieval,
        {
          maxOutputTokens: config.OPENAI_ANSWER_MAX_OUTPUT_TOKENS,
          contextChars: config.OPENAI_ANSWER_CONTEXT_CHARS,
          retrievalLimit: config.OPENAI_RETRIEVAL_LIMIT
        }
      )
    : null;

  const publicRoutes = new Set([
    "/api/health",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/device/start",
    "/api/auth/device/poll",
    "/api/plans",
    "/api/billing/webhooks/stripe"
  ]);
  app.addHook("preHandler", async (request, reply) => {
    if (!config.AUTH_REQUIRED || publicRoutes.has(request.url.split("?")[0] ?? request.url)) return;
    const rawAuthorization = request.headers.authorization;
    const accessToken = rawAuthorization?.startsWith("Bearer ")
      ? rawAuthorization.slice("Bearer ".length)
      : null;
    if (!accessToken || !authService) return reply.code(401).send({ message: "Unauthorized" });
    const authenticated = await authService.authenticate(accessToken);
    if (!authenticated) return reply.code(401).send({ message: "Unauthorized" });
    (request as RequestWithAuth).auth = authenticated;
  });

  app.post(
    "/api/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!authService)
        return reply.code(503).send({ message: "Authentication is not configured" });
      const input = RegisterRequestSchema.parse(request.body);
      const session = await authService.register(input);
      if (usageService) await usageService.ensureTrialGrant(session.user.id);
      setRefreshCookie(reply, session.refreshToken, config.NODE_ENV === "production");
      return reply.code(201).send({ ...session, refreshToken: undefined });
    }
  );

  app.post(
    "/api/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!authService)
        return reply.code(503).send({ message: "Authentication is not configured" });
      const input = LoginRequestSchema.parse(request.body);
      const session = await authService.login(input.email, input.password);
      setRefreshCookie(reply, session.refreshToken, config.NODE_ENV === "production");
      return { ...session, refreshToken: undefined };
    }
  );

  app.post("/api/auth/refresh", async (request, reply) => {
    if (!authService) return reply.code(503).send({ message: "Authentication is not configured" });
    const input = RefreshRequestSchema.parse(request.body ?? {});
    const refreshToken = input.refreshToken ?? readCookie(request.headers.cookie, "mc_refresh");
    if (!refreshToken) return reply.code(401).send({ message: "Refresh token is required" });
    const session = await authService.refresh(refreshToken);
    setRefreshCookie(reply, session.refreshToken, config.NODE_ENV === "production");
    return { ...session, refreshToken: input.refreshToken ? session.refreshToken : undefined };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const auth = requireAuth(request, config.AUTH_REQUIRED);
    if (auth && authService) await authService.revokeSession(auth.sessionId);
    reply.header(
      "set-cookie",
      `mc_refresh=; Path=/api/auth; HttpOnly; SameSite=${config.NODE_ENV === "production" ? "None; Secure" : "Lax"}; Max-Age=0`
    );
    return reply.code(204).send();
  });

  app.post("/api/auth/device/start", async (request, reply) => {
    if (!deviceAuthorizationService) {
      return reply.code(503).send({ message: "Device authorization is not configured" });
    }
    const input = DeviceAuthorizationStartSchema.parse(request.body);
    return reply
      .code(201)
      .send(await deviceAuthorizationService.start(input.deviceName, input.platform));
  });

  app.post(
    "/api/auth/device/poll",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!deviceAuthorizationService) {
        return reply.code(503).send({ message: "Device authorization is not configured" });
      }
      const input = DeviceAuthorizationPollSchema.parse(request.body);
      return deviceAuthorizationService.poll(input.deviceCode);
    }
  );

  app.post("/api/auth/device/approve", async (request, reply) => {
    if (!deviceAuthorizationService || !usageService) {
      return reply.code(503).send({ message: "Device authorization is not configured" });
    }
    const auth = requireAuth(request, true);
    if (!auth) throw new AuthError("Unauthorized");
    const input = DeviceAuthorizationApproveSchema.parse(request.body);
    const summary = await usageService.summary(auth.id);
    return deviceAuthorizationService.approve(
      auth.id,
      input.userCode,
      summary.entitlements.maxActiveDevices
    );
  });

  app.get("/api/account/devices", async (request, reply) => {
    if (!deviceAuthorizationService) {
      return reply.code(503).send({ message: "Device authorization is not configured" });
    }
    const auth = requireAuth(request, true);
    if (!auth) throw new AuthError("Unauthorized");
    const rows = await deviceAuthorizationService.list(auth.id);
    return rows.map((device) => ({
      ...device,
      createdAt: device.createdAt.toISOString(),
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      revokedAt: device.revokedAt?.toISOString() ?? null
    }));
  });

  app.delete<{ Params: { id: string } }>("/api/account/devices/:id", async (request, reply) => {
    if (!deviceAuthorizationService) {
      return reply.code(503).send({ message: "Device authorization is not configured" });
    }
    const auth = requireAuth(request, true);
    if (!auth) throw new AuthError("Unauthorized");
    const revoked = await deviceAuthorizationService.revoke(auth.id, request.params.id);
    return revoked ? reply.code(204).send() : reply.code(404).send({ message: "Device not found" });
  });

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
    const userId = requestUserId(request);
    if (usageService && userId !== "local") {
      const summary = await usageService.summary(userId);
      if (summary.credits.balanceMicrocredits <= 0) {
        return reply.code(402).send({ message: "Insufficient credits" });
      }
    }
    const input = RealtimeTokenRequestSchema.parse(request.body);
    return tokenService.create(input);
  });

  app.post(
    "/api/answers",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!answerService)
        return reply.code(503).send({ message: "OPENAI_API_KEY is not configured" });
      const input = AnswerRequestSchema.parse(request.body);
      const userId = requestUserId(request);
      if (!usageService || userId === "local") return answerService.generate(input, userId);
      const summary = await usageService.summary(userId);
      if (tierRank(input.intelligenceLevel) > tierRank(summary.entitlements.answerTier)) {
        return reply.code(403).send({ message: "This answer tier is not included in your plan" });
      }
      const idempotencyKey =
        readSingleHeader(request.headers["x-idempotency-key"]) ?? `answer:${randomUUID()}`;
      const reservation = await usageService.reserveAnswer(
        userId,
        idempotencyKey,
        input.intelligenceLevel
      );
      try {
        const answer = await answerService.generate(input, userId);
        await usageService.settleAnswer(reservation.usageId, { model: answer.model });
        return answer;
      } catch (error) {
        await usageService.release(reservation.usageId);
        throw error;
      }
    }
  );

  app.get("/api/account/billing", async (request, reply) => {
    if (!usageService) return reply.code(503).send({ message: "Billing is not configured" });
    return usageService.summary(requestUserId(request));
  });

  app.get("/api/plans", () => Object.values(PLAN_CATALOG));

  app.post("/api/usage/transcription", async (request, reply) => {
    if (!usageService)
      return reply.code(503).send({ message: "Usage accounting is not configured" });
    const input = TranscriptionUsageReportSchema.parse(request.body);
    await usageService.recordTranscription({
      userId: requestUserId(request),
      idempotencyKey: input.idempotencyKey,
      audioSeconds: input.audioSeconds,
      model: config.OPENAI_REALTIME_TRANSCRIPTION_MODEL,
      occurredAt: new Date(input.occurredAt)
    });
    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/billing/checkout", async (request, reply) => {
    if (!billingService) return reply.code(503).send({ message: "Stripe is not configured" });
    const input = CheckoutRequestSchema.parse(request.body);
    const auth = requireAuth(request, true);
    if (!auth) throw new AuthError("Unauthorized");
    return billingService.createCheckout(auth, input.plan, input.returnUrl);
  });

  app.post("/api/billing/portal", async (request, reply) => {
    if (!billingService) return reply.code(503).send({ message: "Stripe is not configured" });
    const auth = requireAuth(request, true);
    if (!auth) throw new AuthError("Unauthorized");
    const returnUrl = z
      .object({ returnUrl: z.string().url().optional() })
      .parse(request.body ?? {});
    return billingService.createPortal(auth.id, returnUrl.returnUrl);
  });

  app.post("/api/billing/webhooks/stripe", async (request, reply) => {
    if (!billingService) return reply.code(503).send({ message: "Stripe is not configured" });
    const signature = readSingleHeader(request.headers["stripe-signature"]);
    if (!signature || !Buffer.isBuffer(request.body)) {
      return reply.code(400).send({ message: "A signed raw Stripe event is required" });
    }
    const event = billingService.constructEvent(request.body, signature);
    const result = await billingService.processEvent(event);
    return { received: true, result };
  });

  app.get("/api/context-profiles", (request) =>
    contextRepository.listProfiles(requestUserId(request as RequestWithAuth))
  );
  app.post("/api/context-profiles", async (request, reply) => {
    const input = CreateContextProfileSchema.parse(request.body);
    const userId = requestUserId(request);
    if (usageService && userId !== "local") {
      const [summary, profiles] = await Promise.all([
        usageService.summary(userId),
        contextRepository.listProfiles(userId)
      ]);
      if (profiles.length >= summary.entitlements.contextProfilesLimit) {
        return reply.code(403).send({ message: "Context profile limit reached" });
      }
    }
    const now = new Date().toISOString();
    const profile: ContextProfile = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    return reply.code(201).send(await contextRepository.saveProfile(userId, profile));
  });
  app.put<{ Params: { id: string } }>("/api/context-profiles/:id", async (request, reply) => {
    const userId = requestUserId(request);
    const existing = await contextRepository.findProfile(userId, request.params.id);
    if (!existing) return reply.code(404).send({ message: "Context profile not found" });
    const patch = UpdateContextProfileSchema.parse(request.body);
    return contextRepository.saveProfile(userId, {
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
    const deleted = await contextRepository.deleteProfile(
      requestUserId(request),
      request.params.id
    );
    return deleted ? reply.code(204).send() : reply.code(404).send({ message: "Not found" });
  });

  app.get("/api/glossary", (request) =>
    contextRepository.listGlossaryTerms(requestUserId(request as RequestWithAuth))
  );
  app.post("/api/glossary", async (request, reply) => {
    const input = CreateGlossaryTermSchema.parse(request.body);
    const now = new Date().toISOString();
    const term: GlossaryTerm = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    return reply
      .code(201)
      .send(await contextRepository.saveGlossaryTerm(requestUserId(request), term));
  });
  app.put<{ Params: { id: string } }>("/api/glossary/:id", async (request, reply) => {
    const userId = requestUserId(request);
    const terms = await contextRepository.listGlossaryTerms(userId);
    const existing = terms.find((term) => term.id === request.params.id);
    if (!existing) return reply.code(404).send({ message: "Glossary term not found" });
    const patch = UpdateGlossaryTermSchema.parse(request.body);
    return contextRepository.saveGlossaryTerm(userId, {
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
    const deleted = await contextRepository.deleteGlossaryTerm(
      requestUserId(request),
      request.params.id
    );
    return deleted ? reply.code(204).send() : reply.code(404).send({ message: "Not found" });
  });

  app.post("/api/documents/upload", async (request, reply) => {
    const userId = requestUserId(request);
    if (usageService && userId !== "local") {
      const summary = await usageService.summary(userId);
      if (!summary.entitlements.documentRetrievalEnabled) {
        return reply.code(403).send({ message: "Document retrieval is not included in your plan" });
      }
    }
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
    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({ message: error.message });
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

function requestUserId(request: RequestWithAuth): string {
  return request.auth?.id ?? "local";
}

function requireAuth(request: RequestWithAuth, required: boolean): AuthenticatedUser | null {
  if (!required) return request.auth ?? null;
  if (!request.auth) throw new AuthError("Unauthorized");
  return request.auth;
}

function setRefreshCookie(
  reply: { header(name: string, value: string): unknown },
  refreshToken: string | undefined,
  secure: boolean
): void {
  if (!refreshToken) return;
  reply.header(
    "set-cookie",
    `mc_refresh=${encodeURIComponent(refreshToken)}; Path=/api/auth; HttpOnly; SameSite=${secure ? "None" : "Lax"}; Max-Age=${30 * 24 * 60 * 60}${secure ? "; Secure" : ""}`
  );
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function readSingleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tierRank(tier: "basic" | "balanced" | "advanced"): number {
  return { basic: 0, balanced: 1, advanced: 2 }[tier];
}
