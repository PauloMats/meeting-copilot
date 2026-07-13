import { describe, expect, it } from "vitest";
import { answerPreview, deriveOverlayVisualState } from "./presentation.js";

describe("overlay presentation", () => {
  it("derives visual state from the domain state", () => {
    expect(
      deriveOverlayVisualState({ captureState: "listening", hasAnswer: false, paused: false })
    ).toBe("listening");
    expect(deriveOverlayVisualState({ captureState: "idle", hasAnswer: true, paused: false })).toBe(
      "answer_ready"
    );
    expect(
      deriveOverlayVisualState({
        captureState: "error",
        hasAnswer: false,
        paused: false,
        errorKind: "permission_denied"
      })
    ).toBe("no_audio");
  });

  it("keeps compact support points bounded", () => {
    const preview = answerPreview({
      sayThis: "Use idempotency keys.",
      keyPoints: ["one", "two", "three", "four"],
      details: "",
      example: "",
      assumptions: [],
      confidence: "medium",
      followUps: []
    });

    expect(preview.keyPoints).toEqual(["one", "two", "three"]);
  });
});
