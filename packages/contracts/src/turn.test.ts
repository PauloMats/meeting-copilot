import { describe, expect, it } from "vitest";
import { summarizeTurnTiming, transitionTurnState } from "./turn.js";

describe("turn state machine", () => {
  it("moves through auto-submit flow", () => {
    expect(transitionTurnState("idle", "start_capture")).toBe("listening");
    expect(transitionTurnState("listening", "stop_capture")).toBe("transcribing");
    expect(transitionTurnState("transcribing", "final_transcript_auto_submit", true)).toBe(
      "thinking"
    );
    expect(transitionTurnState("thinking", "answer_received")).toBe("idle");
  });

  it("moves through manual review flow", () => {
    expect(transitionTurnState("transcribing", "final_transcript_manual_review")).toBe(
      "ready_to_send"
    );
    expect(transitionTurnState("ready_to_send", "submit")).toBe("thinking");
  });

  it("summarizes monotonic timing without content", () => {
    expect(
      summarizeTurnTiming(
        {
          turnId: "turn-1",
          captureStartedAtMs: 100,
          transcriptFinalAtMs: 750,
          answerReceivedAtMs: 2_000
        },
        42,
        120
      )
    ).toEqual({
      turnId: "turn-1",
      transcriptChars: 42,
      answerChars: 120,
      captureToTranscriptMs: 650,
      transcriptToAnswerMs: 1250,
      totalMs: 1900
    });
  });
});
