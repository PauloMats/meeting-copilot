import { describe, expect, it } from "vitest";
import { AnswerSchema, DEFAULT_SETTINGS } from "./domain.js";

describe("contracts", () => {
  it("uses privacy-first defaults", () => {
    expect(DEFAULT_SETTINGS.doNotSaveAudio).toBe(true);
    expect(DEFAULT_SETTINGS.autoSubmit).toBe(true);
    expect(DEFAULT_SETTINGS.submissionMode).toBe("push_to_talk");
    expect(DEFAULT_SETTINGS.audioRetentionDays).toBe(0);
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(DEFAULT_SETTINGS.overlayMode).toBe("compact");
    expect(DEFAULT_SETTINGS.overlayClickThrough).toBe(false);
  });

  it("rejects incomplete answers", () => {
    expect(() => AnswerSchema.parse({ sayThis: "Use a queue." })).toThrow();
  });

  it("accepts speakable answers", () => {
    expect(
      AnswerSchema.parse({
        sayThis: "Use idempotency keys and retry only transient failures.",
        keyPoints: ["Store one request key per operation."]
      })
    ).toMatchObject({
      confidence: "medium",
      details: "",
      example: "",
      assumptions: [],
      followUps: []
    });
  });
});
