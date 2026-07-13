import type { IntelligenceLevel } from "@meeting-copilot/contracts";
import {
  creditLedgerEntries,
  subscriptions,
  usageRecords,
  type Database
} from "@meeting-copilot/database";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ANSWER_RESERVATION_MICROCREDITS, PLAN_CATALOG } from "../entitlements/catalog.js";

export class InsufficientCreditsError extends Error {
  readonly statusCode = 402;
  constructor() {
    super("Insufficient credits");
  }
}

export class UsageService {
  constructor(private readonly database: Database) {}

  async ensureTrialGrant(userId: string): Promise<void> {
    await this.database
      .insert(creditLedgerEntries)
      .values({
        userId,
        entryType: "grant",
        amountMicrocredits: PLAN_CATALOG.trial.transcriptionSecondsPerPeriod * 1_000,
        idempotencyKey: `trial-grant:${userId}`,
        metadata: { plan: "trial" }
      })
      .onConflictDoNothing({ target: creditLedgerEntries.idempotencyKey });
  }

  async reserveAnswer(
    userId: string,
    idempotencyKey: string,
    intelligenceLevel: IntelligenceLevel
  ): Promise<{ usageId: string; reservedMicrocredits: number }> {
    const reservedMicrocredits = ANSWER_RESERVATION_MICROCREDITS[intelligenceLevel];
    return this.database.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: usageRecords.id, reserved: usageRecords.reservedMicrocredits })
        .from(usageRecords)
        .where(
          and(eq(usageRecords.userId, userId), eq(usageRecords.idempotencyKey, idempotencyKey))
        )
        .limit(1);
      if (existing) return { usageId: existing.id, reservedMicrocredits: existing.reserved };

      const [balanceRow] = await tx
        .select({
          balance: sql<number>`coalesce(sum(${creditLedgerEntries.amountMicrocredits}), 0)`
        })
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.userId, userId));
      const balance = Number(balanceRow?.balance ?? 0);
      if (balance < reservedMicrocredits) throw new InsufficientCreditsError();
      const [usage] = await tx
        .insert(usageRecords)
        .values({
          userId,
          feature: "answer",
          idempotencyKey,
          reservedMicrocredits
        })
        .returning({ id: usageRecords.id });
      if (!usage) throw new Error("Could not reserve usage");
      await tx.insert(creditLedgerEntries).values({
        userId,
        usageRecordId: usage.id,
        entryType: "reservation",
        amountMicrocredits: -reservedMicrocredits,
        idempotencyKey: `usage:${usage.id}:reservation`
      });
      return { usageId: usage.id, reservedMicrocredits };
    });
  }

  async settleAnswer(
    usageId: string,
    details: {
      model: string;
      inputTokens?: number;
      cachedInputTokens?: number;
      outputTokens?: number;
    }
  ): Promise<void> {
    await this.database
      .update(usageRecords)
      .set({
        status: "settled",
        model: details.model,
        inputTokens: details.inputTokens,
        cachedInputTokens: details.cachedInputTokens,
        outputTokens: details.outputTokens,
        settledMicrocredits: sql`${usageRecords.reservedMicrocredits}`,
        settledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(usageRecords.id, usageId));
  }

  async release(usageId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [usage] = await tx
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.id, usageId))
        .limit(1);
      if (!usage || usage.status !== "reserved") return;
      await tx.insert(creditLedgerEntries).values({
        userId: usage.userId,
        usageRecordId: usage.id,
        entryType: "release",
        amountMicrocredits: usage.reservedMicrocredits,
        idempotencyKey: `usage:${usage.id}:release`
      });
      await tx
        .update(usageRecords)
        .set({ status: "released", settledAt: new Date(), updatedAt: new Date() })
        .where(eq(usageRecords.id, usage.id));
    });
  }

  async recordTranscription(input: {
    userId: string;
    idempotencyKey: string;
    audioSeconds: number;
    model: string;
    occurredAt: Date;
  }): Promise<void> {
    const cost = input.audioSeconds * 1_000;
    await this.database.transaction(async (tx) => {
      const [balanceRow] = await tx
        .select({
          balance: sql<number>`coalesce(sum(${creditLedgerEntries.amountMicrocredits}), 0)`
        })
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.userId, input.userId));
      const balance = Number(balanceRow?.balance ?? 0);
      if (balance < cost) throw new InsufficientCreditsError();
      const [usage] = await tx
        .insert(usageRecords)
        .values({
          userId: input.userId,
          feature: "transcription",
          status: "settled",
          idempotencyKey: input.idempotencyKey,
          audioSeconds: input.audioSeconds,
          model: input.model,
          reservedMicrocredits: cost,
          settledMicrocredits: cost,
          occurredAt: input.occurredAt,
          settledAt: new Date()
        })
        .onConflictDoNothing({
          target: [usageRecords.userId, usageRecords.idempotencyKey]
        })
        .returning({ id: usageRecords.id });
      if (!usage) return;
      await tx.insert(creditLedgerEntries).values({
        userId: input.userId,
        usageRecordId: usage.id,
        entryType: "settlement",
        amountMicrocredits: -cost,
        idempotencyKey: `usage:${usage.id}:settlement`
      });
    });
  }

  async summary(userId: string) {
    await this.ensureTrialGrant(userId);
    const [subscription] = await this.database
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, ["trialing", "active", "past_due"])
        )
      )
      .orderBy(desc(subscriptions.providerUpdatedAt))
      .limit(1);
    const plan = subscription?.planCode ?? "trial";
    return {
      entitlements: PLAN_CATALOG[plan],
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
          }
        : null,
      credits: {
        balanceMicrocredits: await readBalance(this.database, userId),
        reservedMicrocredits: 0
      }
    };
  }
}

async function readBalance(database: Database, userId: string): Promise<number> {
  const [row] = await database
    .select({ balance: sql<number>`coalesce(sum(${creditLedgerEntries.amountMicrocredits}), 0)` })
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.userId, userId));
  return Number(row?.balance ?? 0);
}
