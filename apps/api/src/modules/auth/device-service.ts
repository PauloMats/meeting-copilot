import {
  deviceAuthorizations,
  devices,
  userSessions,
  type Database
} from "@meeting-copilot/database";
import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { createOpaqueToken, hashToken } from "./crypto.js";
import type { AuthService } from "./service.js";
import { AuthError } from "./service.js";

const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;

export class DeviceAuthorizationService {
  constructor(
    private readonly database: Database,
    private readonly authService: AuthService,
    private readonly pepper: string,
    private readonly verificationUri: string
  ) {}

  async start(deviceName: string, platform: string) {
    const deviceCode = createOpaqueToken();
    const userCode = createUserCode();
    await this.database.insert(deviceAuthorizations).values({
      deviceCodeHash: hashToken(deviceCode, this.pepper),
      userCodeHash: hashToken(userCode, this.pepper),
      deviceName,
      platform,
      expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_MS)
    });
    return {
      deviceCode,
      userCode,
      verificationUri: this.verificationUri,
      expiresInSeconds: DEVICE_CODE_TTL_MS / 1_000,
      intervalSeconds: 3
    };
  }

  async approve(userId: string, userCode: string, maxActiveDevices: number) {
    const [authorization] = await this.database
      .select()
      .from(deviceAuthorizations)
      .where(eq(deviceAuthorizations.userCodeHash, hashToken(userCode, this.pepper)))
      .limit(1);
    if (!authorization || authorization.status !== "pending") {
      throw new AuthError("Device code is invalid or already used", 404);
    }
    if (authorization.expiresAt <= new Date()) {
      await this.database
        .update(deviceAuthorizations)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(deviceAuthorizations.id, authorization.id));
      throw new AuthError("Device code expired", 410);
    }
    const activeDevices = await this.database
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.userId, userId), isNull(devices.revokedAt)));
    if (activeDevices.length >= maxActiveDevices) {
      throw new AuthError("Device limit reached; revoke a device or upgrade your plan", 403);
    }
    const [device] = await this.database.transaction(async (tx) => {
      const created = await tx
        .insert(devices)
        .values({
          userId,
          name: authorization.deviceName,
          platform: authorization.platform,
          lastSeenAt: new Date()
        })
        .returning();
      const current = created[0];
      if (!current) throw new Error("Could not create device");
      await tx
        .update(deviceAuthorizations)
        .set({
          userId,
          deviceId: current.id,
          status: "approved",
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(deviceAuthorizations.id, authorization.id));
      return [current];
    });
    return { approved: true, deviceId: device?.id };
  }

  async poll(deviceCode: string) {
    const [authorization] = await this.database
      .select()
      .from(deviceAuthorizations)
      .where(eq(deviceAuthorizations.deviceCodeHash, hashToken(deviceCode, this.pepper)))
      .limit(1);
    if (!authorization) throw new AuthError("Invalid device code");
    if (authorization.expiresAt <= new Date() && authorization.status === "pending") {
      await this.database
        .update(deviceAuthorizations)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(deviceAuthorizations.id, authorization.id));
      return { status: "expired" as const };
    }
    if (authorization.status === "pending") {
      await this.database
        .update(deviceAuthorizations)
        .set({ lastPolledAt: new Date(), updatedAt: new Date() })
        .where(eq(deviceAuthorizations.id, authorization.id));
      return { status: "pending" as const };
    }
    if (authorization.status !== "approved" || !authorization.userId || !authorization.deviceId) {
      return { status: authorization.status };
    }
    const claimed = await this.database.transaction(async (tx) => {
      const [row] = await tx
        .update(deviceAuthorizations)
        .set({ status: "consumed", consumedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(deviceAuthorizations.id, authorization.id),
            eq(deviceAuthorizations.status, "approved")
          )
        )
        .returning({ id: deviceAuthorizations.id });
      return Boolean(row);
    });
    if (!claimed) return { status: "consumed" as const };
    const session = await this.authService.issueDeviceSession(
      authorization.userId,
      authorization.deviceId
    );
    return { status: "authorized" as const, session };
  }

  async list(userId: string) {
    return this.database
      .select({
        id: devices.id,
        name: devices.name,
        platform: devices.platform,
        lastSeenAt: devices.lastSeenAt,
        createdAt: devices.createdAt,
        revokedAt: devices.revokedAt
      })
      .from(devices)
      .where(eq(devices.userId, userId));
  }

  async revoke(userId: string, deviceId: string): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const [device] = await tx
        .update(devices)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(devices.id, deviceId), eq(devices.userId, userId), isNull(devices.revokedAt)))
        .returning({ id: devices.id });
      if (!device) return false;
      await tx
        .update(userSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(userSessions.deviceId, deviceId));
      return true;
    });
  }
}

function createUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const value = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}
