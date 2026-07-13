import { z } from "zod";

export const PlanCodeSchema = z.enum(["trial", "basic", "pro", "advanced"]);
export type PlanCode = z.infer<typeof PlanCodeSchema>;

export const AnswerTierSchema = z.enum(["basic", "balanced", "advanced"]);
export type AnswerTier = z.infer<typeof AnswerTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused"
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const RegisterRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(256),
  displayName: z.string().trim().min(1).max(160).optional()
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
  deviceName: z.string().trim().min(1).max(160).optional()
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional()
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const SessionTokensSchema = z.object({
  accessToken: z.string().min(32),
  expiresInSeconds: z.number().int().positive(),
  refreshToken: z.string().min(32).optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean()
  })
});
export type SessionTokens = z.infer<typeof SessionTokensSchema>;

export const DeviceAuthorizationStartSchema = z.object({
  deviceName: z.string().trim().min(1).max(160),
  platform: z.string().trim().min(1).max(80).default("windows")
});
export type DeviceAuthorizationStart = z.infer<typeof DeviceAuthorizationStartSchema>;

export const DeviceAuthorizationResponseSchema = z.object({
  deviceCode: z.string().min(32),
  userCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  verificationUri: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
  intervalSeconds: z.number().int().min(2)
});
export type DeviceAuthorizationResponse = z.infer<typeof DeviceAuthorizationResponseSchema>;

export const DeviceAuthorizationPollSchema = z.object({
  deviceCode: z.string().min(32)
});
export type DeviceAuthorizationPoll = z.infer<typeof DeviceAuthorizationPollSchema>;

export const DeviceAuthorizationApproveSchema = z.object({
  userCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
});
export type DeviceAuthorizationApprove = z.infer<typeof DeviceAuthorizationApproveSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  platform: z.string(),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable()
});
export type Device = z.infer<typeof DeviceSchema>;

export const EntitlementsSchema = z.object({
  plan: PlanCodeSchema,
  answerTier: AnswerTierSchema,
  transcriptionSecondsPerPeriod: z.number().int().nonnegative(),
  maxActiveDevices: z.number().int().positive(),
  contextProfilesLimit: z.number().int().positive(),
  documentRetrievalEnabled: z.boolean(),
  historyRetentionDays: z.number().int().nonnegative()
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;

export const BillingSummarySchema = z.object({
  entitlements: EntitlementsSchema,
  subscription: z
    .object({
      status: SubscriptionStatusSchema,
      currentPeriodEnd: z.string().datetime().nullable(),
      cancelAtPeriodEnd: z.boolean()
    })
    .nullable(),
  credits: z.object({
    balanceMicrocredits: z.number().int(),
    reservedMicrocredits: z.number().int().nonnegative()
  })
});
export type BillingSummary = z.infer<typeof BillingSummarySchema>;

export const CheckoutRequestSchema = z.object({
  plan: PlanCodeSchema.exclude(["trial"]),
  returnUrl: z.string().url().optional()
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const UsageFeatureSchema = z.enum(["transcription", "answer", "retrieval", "storage"]);
export type UsageFeature = z.infer<typeof UsageFeatureSchema>;

export const TranscriptionUsageReportSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
  audioSeconds: z
    .number()
    .int()
    .positive()
    .max(8 * 60 * 60),
  occurredAt: z.string().datetime()
});
export type TranscriptionUsageReport = z.infer<typeof TranscriptionUsageReportSchema>;
