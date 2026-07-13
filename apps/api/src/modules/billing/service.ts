import type { PlanCode } from "@meeting-copilot/contracts";
import {
  billingEvents,
  creditLedgerEntries,
  stripeCustomers,
  subscriptions,
  type Database
} from "@meeting-copilot/database";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { PLAN_CATALOG } from "../entitlements/catalog.js";

type PaidPlan = Exclude<PlanCode, "trial">;

export class BillingService {
  private readonly stripe: Stripe;

  constructor(
    private readonly database: Database,
    secretKey: string,
    private readonly webhookSecret: string | undefined,
    private readonly prices: Record<PaidPlan, string | undefined>,
    private readonly publicWebUrl: string
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckout(user: { id: string; email: string }, plan: PaidPlan, returnUrl?: string) {
    const price = this.prices[plan];
    if (!price) throw new BillingConfigurationError(`Stripe price is not configured for ${plan}`);
    const customerId = await this.resolveCustomer(user);
    const safeReturnUrl = this.safeReturnUrl(returnUrl);
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${safeReturnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeReturnUrl}?checkout=canceled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan }
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { url: session.url };
  }

  async createPortal(userId: string, returnUrl?: string) {
    const [customer] = await this.database
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.userId, userId))
      .limit(1);
    if (!customer)
      throw new BillingConfigurationError("No billing customer exists for this account", 404);
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: this.safeReturnUrl(returnUrl)
    });
    return { url: session.url };
  }

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret)
      throw new BillingConfigurationError("Stripe webhook is not configured");
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  async processEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
    const [inserted] = await this.database
      .insert(billingEvents)
      .values({
        stripeEventId: event.id,
        eventType: event.type,
        providerCreatedAt: new Date(event.created * 1_000),
        payload: event as unknown as Record<string, unknown>
      })
      .onConflictDoNothing({ target: billingEvents.stripeEventId })
      .returning({ id: billingEvents.id });
    if (!inserted) return "duplicate";

    try {
      if (event.type.startsWith("customer.subscription.")) {
        await this.projectSubscription(event.data.object as Stripe.Subscription, event.created);
      } else if (
        event.type !== "checkout.session.completed" &&
        event.type !== "invoice.paid" &&
        event.type !== "invoice.payment_failed"
      ) {
        await this.completeEvent(inserted.id, "ignored");
        return "ignored";
      }
      await this.completeEvent(inserted.id, "processed");
      return "processed";
    } catch (error) {
      await this.database
        .update(billingEvents)
        .set({
          status: "failed",
          errorCode: error instanceof Error ? error.name.slice(0, 120) : "UNKNOWN",
          errorMessage: error instanceof Error ? error.message.slice(0, 2_000) : "Unknown error",
          updatedAt: new Date()
        })
        .where(eq(billingEvents.id, inserted.id));
      throw error;
    }
  }

  private async resolveCustomer(user: { id: string; email: string }): Promise<string> {
    const [existing] = await this.database
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.userId, user.id))
      .limit(1);
    if (existing) return existing.stripeCustomerId;
    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: { meetingCopilotUserId: user.id }
    });
    await this.database.insert(stripeCustomers).values({
      userId: user.id,
      stripeCustomerId: customer.id
    });
    return customer.id;
  }

  private async projectSubscription(subscription: Stripe.Subscription, eventCreated: number) {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const [customer] = await this.database
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.stripeCustomerId, customerId))
      .limit(1);
    if (!customer) throw new Error("Stripe customer is not mapped to a Meeting Copilot user");
    const item = subscription.items.data[0];
    const priceId = item?.price.id;
    if (!item || !priceId) throw new Error("Subscription has no price item");
    const plan = this.planForPrice(priceId);
    const providerUpdatedAt = new Date(eventCreated * 1_000);
    const status = normalizeStatus(subscription.status);
    const [projected] = await this.database
      .insert(subscriptions)
      .values({
        userId: customer.userId,
        planCode: plan,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status,
        currentPeriodStart: new Date(item.current_period_start * 1_000),
        currentPeriodEnd: new Date(item.current_period_end * 1_000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        providerUpdatedAt
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          planCode: plan,
          stripePriceId: priceId,
          status,
          currentPeriodStart: new Date(item.current_period_start * 1_000),
          currentPeriodEnd: new Date(item.current_period_end * 1_000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          providerUpdatedAt,
          updatedAt: new Date()
        },
        setWhere: sql`${subscriptions.providerUpdatedAt} <= ${providerUpdatedAt}`
      })
      .returning({ id: subscriptions.id });
    if (projected && (status === "active" || status === "trialing")) {
      await this.database
        .insert(creditLedgerEntries)
        .values({
          userId: customer.userId,
          subscriptionId: projected.id,
          entryType: "grant",
          amountMicrocredits: PLAN_CATALOG[plan].transcriptionSecondsPerPeriod * 1_000,
          idempotencyKey: `subscription-grant:${subscription.id}:${item.current_period_start}`,
          expiresAt: new Date(item.current_period_end * 1_000),
          metadata: { plan }
        })
        .onConflictDoNothing({ target: creditLedgerEntries.idempotencyKey });
    }
  }

  private planForPrice(priceId: string): PaidPlan {
    const match = Object.entries(this.prices).find(([, value]) => value === priceId)?.[0];
    if (match === "basic" || match === "pro" || match === "advanced") return match;
    throw new Error("Stripe subscription uses a price outside the Meeting Copilot allowlist");
  }

  private safeReturnUrl(returnUrl: string | undefined): string {
    const fallback = new URL("/account", this.publicWebUrl).toString();
    if (!returnUrl) return fallback;
    const requested = new URL(returnUrl);
    const allowed = new URL(this.publicWebUrl);
    return requested.origin === allowed.origin ? requested.toString() : fallback;
  }

  private async completeEvent(id: string, status: "processed" | "ignored") {
    await this.database
      .update(billingEvents)
      .set({ status, processedAt: new Date(), updatedAt: new Date() })
      .where(eq(billingEvents.id, id));
  }
}

export class BillingConfigurationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 503
  ) {
    super(message);
  }
}

function normalizeStatus(status: Stripe.Subscription.Status) {
  if (status === "incomplete_expired") return "incomplete" as const;
  return status;
}
