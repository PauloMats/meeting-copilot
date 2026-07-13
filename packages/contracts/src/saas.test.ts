import { describe, expect, it } from "vitest";
import {
  CheckoutRequestSchema,
  DeviceAuthorizationApproveSchema,
  RegisterRequestSchema,
  TranscriptionUsageReportSchema
} from "./saas.js";

describe("SaaS contracts", () => {
  it("normalizes registration email and enforces a useful password floor", () => {
    const registration = RegisterRequestSchema.parse({
      email: "  USER@Example.COM ",
      password: "correct horse battery staple"
    });
    expect(registration.email).toBe("user@example.com");
    expect(() =>
      RegisterRequestSchema.parse({ email: "user@example.com", password: "short" })
    ).toThrow();
  });

  it("normalizes device approval codes", () => {
    expect(DeviceAuthorizationApproveSchema.parse({ userCode: "abcd-1234" }).userCode).toBe(
      "ABCD-1234"
    );
  });

  it("does not allow checkout for the internal trial plan", () => {
    expect(() => CheckoutRequestSchema.parse({ plan: "trial" })).toThrow();
    expect(CheckoutRequestSchema.parse({ plan: "pro" }).plan).toBe("pro");
  });

  it("bounds client-reported transcription usage", () => {
    expect(
      TranscriptionUsageReportSchema.parse({
        idempotencyKey: "meeting-01-turn-01",
        audioSeconds: 42,
        occurredAt: new Date().toISOString()
      }).audioSeconds
    ).toBe(42);
  });
});
