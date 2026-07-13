import type { Entitlements, PlanCode } from "@meeting-copilot/contracts";

export const PLAN_CATALOG: Record<PlanCode, Entitlements> = {
  trial: {
    plan: "trial",
    answerTier: "basic",
    transcriptionSecondsPerPeriod: 30 * 60,
    maxActiveDevices: 1,
    contextProfilesLimit: 1,
    documentRetrievalEnabled: false,
    historyRetentionDays: 7
  },
  basic: {
    plan: "basic",
    answerTier: "basic",
    transcriptionSecondsPerPeriod: 180 * 60,
    maxActiveDevices: 1,
    contextProfilesLimit: 3,
    documentRetrievalEnabled: false,
    historyRetentionDays: 30
  },
  pro: {
    plan: "pro",
    answerTier: "balanced",
    transcriptionSecondsPerPeriod: 480 * 60,
    maxActiveDevices: 3,
    contextProfilesLimit: 10,
    documentRetrievalEnabled: true,
    historyRetentionDays: 90
  },
  advanced: {
    plan: "advanced",
    answerTier: "advanced",
    transcriptionSecondsPerPeriod: 1_200 * 60,
    maxActiveDevices: 5,
    contextProfilesLimit: 30,
    documentRetrievalEnabled: true,
    historyRetentionDays: 365
  }
};

export const ANSWER_RESERVATION_MICROCREDITS = {
  basic: 5,
  balanced: 20,
  advanced: 60
} as const;
