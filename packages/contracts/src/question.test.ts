import { describe, expect, it } from "vitest";
import {
  RecentQuestionDeduplicator,
  detectQuestionCandidate,
  questionFingerprint
} from "./question.js";

describe("question detection", () => {
  it("accepts likely Portuguese technical questions", () => {
    const result = detectQuestionCandidate(
      "Como você lidaria com retries e idempotência nesse fluxo de pagamento?"
    );

    expect(result.accepted).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("accepts likely English technical questions", () => {
    const result = detectQuestionCandidate("How would you design retries for this API?");

    expect(result.accepted).toBe(true);
  });

  it("rejects generic meeting prompts", () => {
    const result = detectQuestionCandidate("Alguém tem alguma dúvida antes de seguir?");

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("generic_meeting_prompt");
  });

  it("deduplicates recent questions using normalized fingerprints", () => {
    const dedupe = new RecentQuestionDeduplicator(10_000);

    expect(questionFingerprint("Como lidar com idempotência?")).toBe("como lidar com idempotencia");
    expect(dedupe.isDuplicate("Como lidar com idempotência?", 1_000)).toBe(false);
    expect(dedupe.isDuplicate("como lidar com idempotencia", 2_000)).toBe(true);
    expect(dedupe.isDuplicate("como lidar com idempotencia", 20_000)).toBe(false);
  });
});
