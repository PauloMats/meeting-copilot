import { describe, expect, it } from "vitest";
import { AnswerSchema, DEFAULT_SETTINGS } from "./domain.js";

describe("contracts", () => {
  it("uses privacy-first defaults", () => {
    expect(DEFAULT_SETTINGS.doNotSaveAudio).toBe(true);
    expect(DEFAULT_SETTINGS.autoSubmit).toBe(true);
    expect(DEFAULT_SETTINGS.audioRetentionDays).toBe(0);
  });

  it("rejects incomplete answers", () => {
    expect(() => AnswerSchema.parse({ direct_answer: "Use a queue." })).toThrow();
  });
});
