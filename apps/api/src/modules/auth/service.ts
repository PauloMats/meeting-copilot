import type { SessionTokens } from "@meeting-copilot/contracts";
import {
  refreshTokens,
  userCredentials,
  userSessions,
  users,
  type Database
} from "@meeting-copilot/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./crypto.js";

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  sessionId: string;
  deviceId: string | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode = 401
  ) {
    super(message);
  }
}

export class AuthService {
  constructor(
    private readonly database: Database,
    private readonly pepper: string
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName?: string | undefined;
  }): Promise<SessionTokens> {
    const passwordHash = await hashPassword(input.password);
    let user: typeof users.$inferSelect;
    try {
      user = await this.database.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({ email: input.email, displayName: input.displayName ?? null })
          .returning();
        if (!created) throw new Error("User creation failed");
        await tx.insert(userCredentials).values({ userId: created.id, passwordHash });
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AuthError("An account already exists", 409);
      throw error;
    }
    return this.issueSession(user, null);
  }

  async login(email: string, password: string): Promise<SessionTokens> {
    const [record] = await this.database
      .select({ user: users, credential: userCredentials })
      .from(users)
      .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    if (!record || !(await verifyPassword(password, record.credential.passwordHash))) {
      throw new AuthError("Invalid email or password");
    }
    return this.issueSession(record.user, null);
  }

  async authenticate(accessToken: string): Promise<AuthenticatedUser | null> {
    const [record] = await this.database
      .select({ session: userSessions, user: users })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.accessTokenHash, hashToken(accessToken, this.pepper)),
          gt(userSessions.accessExpiresAt, new Date()),
          isNull(userSessions.revokedAt),
          isNull(users.deletedAt)
        )
      )
      .limit(1);
    if (!record) return null;
    await this.database
      .update(userSessions)
      .set({ lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(userSessions.id, record.session.id));
    return {
      id: record.user.id,
      email: record.user.email,
      displayName: record.user.displayName,
      emailVerified: Boolean(record.user.emailVerifiedAt),
      sessionId: record.session.id,
      deviceId: record.session.deviceId
    };
  }

  async refresh(rawRefreshToken: string): Promise<SessionTokens> {
    const tokenHash = hashToken(rawRefreshToken, this.pepper);
    return this.database.transaction(async (tx) => {
      const [record] = await tx
        .select({ token: refreshTokens, session: userSessions, user: users })
        .from(refreshTokens)
        .innerJoin(userSessions, eq(refreshTokens.sessionId, userSessions.id))
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      if (!record) throw new AuthError("Invalid refresh token");
      if (
        record.token.status !== "active" ||
        record.token.expiresAt <= new Date() ||
        record.session.revokedAt
      ) {
        await tx
          .update(refreshTokens)
          .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
          .where(eq(refreshTokens.familyId, record.token.familyId));
        await tx
          .update(userSessions)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(eq(userSessions.id, record.session.id));
        throw new AuthError("Refresh token reuse detected");
      }

      const accessToken = createOpaqueToken();
      const refreshToken = createOpaqueToken();
      const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_MS);
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
      const [nextRefresh] = await tx
        .insert(refreshTokens)
        .values({
          sessionId: record.session.id,
          familyId: record.token.familyId,
          tokenHash: hashToken(refreshToken, this.pepper),
          expiresAt: refreshExpiresAt
        })
        .returning({ id: refreshTokens.id });
      await tx
        .update(refreshTokens)
        .set({
          status: "rotated",
          usedAt: new Date(),
          rotatedToId: nextRefresh?.id,
          updatedAt: new Date()
        })
        .where(eq(refreshTokens.id, record.token.id));
      await tx
        .update(userSessions)
        .set({
          accessTokenHash: hashToken(accessToken, this.pepper),
          accessExpiresAt,
          lastSeenAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userSessions.id, record.session.id));
      return sessionResponse(record.user, accessToken, refreshToken);
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx
        .update(userSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(userSessions.id, sessionId));
      await tx
        .update(refreshTokens)
        .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(refreshTokens.sessionId, sessionId));
    });
  }

  async issueDeviceSession(userId: string, deviceId: string): Promise<SessionTokens> {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new AuthError("User not found", 404);
    return this.issueSession(user, deviceId);
  }

  private async issueSession(
    user: typeof users.$inferSelect,
    deviceId: string | null
  ): Promise<SessionTokens> {
    const accessToken = createOpaqueToken();
    const refreshToken = createOpaqueToken();
    const familyId = randomUUID();
    const [session] = await this.database
      .insert(userSessions)
      .values({
        userId: user.id,
        deviceId,
        accessTokenHash: hashToken(accessToken, this.pepper),
        accessExpiresAt: new Date(Date.now() + ACCESS_TTL_MS)
      })
      .returning();
    if (!session) throw new Error("Session creation failed");
    await this.database.insert(refreshTokens).values({
      sessionId: session.id,
      familyId,
      tokenHash: hashToken(refreshToken, this.pepper),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS)
    });
    return sessionResponse(user, accessToken, refreshToken);
  }
}

function sessionResponse(
  user: typeof users.$inferSelect,
  accessToken: string,
  refreshToken: string
): SessionTokens {
  return {
    accessToken,
    refreshToken,
    expiresInSeconds: ACCESS_TTL_MS / 1000,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: Boolean(user.emailVerifiedAt)
    }
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}
