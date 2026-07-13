import { z } from "zod";
import type { Answer, CaptureState } from "./domain.js";

export const OverlayVisualStateSchema = z.enum([
  "idle",
  "listening",
  "transcribing",
  "question_detected",
  "thinking",
  "answer_ready",
  "paused",
  "offline",
  "no_audio",
  "error"
]);
export type OverlayVisualState = z.infer<typeof OverlayVisualStateSchema>;

export type UiErrorKind =
  | "offline"
  | "rate_limit"
  | "timeout"
  | "permission_denied"
  | "no_audio"
  | "source_disconnected"
  | "cancelled"
  | "unexpected";

export interface UiError {
  kind: UiErrorKind;
  title: string;
  impact: string;
  preserved: string;
  action: string;
  retryable: boolean;
}

export function deriveOverlayVisualState(input: {
  captureState: CaptureState;
  hasAnswer: boolean;
  paused: boolean;
  errorKind?: UiErrorKind | null | undefined;
}): OverlayVisualState {
  if (input.paused) return "paused";
  if (input.captureState === "error") {
    if (input.errorKind === "offline" || input.errorKind === "timeout") return "offline";
    if (
      input.errorKind === "no_audio" ||
      input.errorKind === "permission_denied" ||
      input.errorKind === "source_disconnected"
    ) {
      return "no_audio";
    }
    return "error";
  }

  switch (input.captureState) {
    case "listening":
      return "listening";
    case "transcribing":
      return "transcribing";
    case "ready_to_send":
      return "question_detected";
    case "thinking":
    case "answering":
      return "thinking";
    case "idle":
      return input.hasAnswer ? "answer_ready" : "idle";
  }
}

export function answerPreview(answer: Answer, maxPoints = 3): Answer {
  return {
    ...answer,
    keyPoints: answer.keyPoints.slice(0, maxPoints)
  };
}
