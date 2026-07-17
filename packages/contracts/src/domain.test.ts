import { describe, expect, it } from "vitest";
import { AnswerSchema, DEFAULT_SETTINGS, MeetingSummarySchema } from "./domain.js";

describe("contracts", () => {
  it("uses privacy-first defaults", () => {
    expect(DEFAULT_SETTINGS.doNotSaveAudio).toBe(true);
    expect(DEFAULT_SETTINGS.autoSubmit).toBe(true);
    expect(DEFAULT_SETTINGS.audioRetentionDays).toBe(0);
  });

  it("rejects incomplete answers", () => {
    expect(() => AnswerSchema.parse({ direct_answer: "Use a queue." })).toThrow();
  });

  it("validates structured meeting summaries", () => {
    const summary = MeetingSummarySchema.parse({
      title: "Weekly planning",
      overview: "The team planned the next delivery.",
      key_topics: [{ topic: "Release", summary: "Ship on Friday." }],
      decisions: [{ decision: "Use staged rollout", context: "Reduce risk." }],
      action_items: [
        {
          task: "Prepare the release notes",
          owner: "Ana",
          due_date: "Friday",
          priority: "high"
        }
      ],
      next_steps: ["Review the rollout plan"],
      open_questions: ["Who monitors the weekend?"]
    });

    expect(summary.action_items[0]?.owner).toBe("Ana");
  });
});
