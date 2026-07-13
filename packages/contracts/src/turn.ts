import { z } from "zod";
import type { CaptureStateSchema } from "./domain.js";

export const TurnEventSchema = z.enum([
  "start_capture",
  "stop_capture",
  "final_transcript_auto_submit",
  "final_transcript_manual_review",
  "submit",
  "answer_started",
  "answer_received",
  "cancel",
  "capture_error",
  "transcription_error",
  "answer_error",
  "reset"
]);
export type TurnEvent = z.infer<typeof TurnEventSchema>;

export const TurnTimingSchema = z.object({
  turnId: z.string(),
  captureStartedAtMs: z.number().optional(),
  firstAudioChunkAtMs: z.number().optional(),
  firstTranscriptDeltaAtMs: z.number().optional(),
  transcriptFinalAtMs: z.number().optional(),
  answerRequestedAtMs: z.number().optional(),
  answerReceivedAtMs: z.number().optional(),
  cancelledAtMs: z.number().optional(),
  failedAtMs: z.number().optional()
});
export type TurnTiming = z.infer<typeof TurnTimingSchema>;

export const TurnMetricsSchema = z.object({
  turnId: z.string(),
  transcriptChars: z.number().int().min(0),
  answerChars: z.number().int().min(0),
  captureToTranscriptMs: z.number().nullable(),
  transcriptToAnswerMs: z.number().nullable(),
  totalMs: z.number().nullable()
});
export type TurnMetrics = z.infer<typeof TurnMetricsSchema>;

export function transitionTurnState(
  state: z.infer<typeof CaptureStateSchema>,
  event: TurnEvent,
  autoSubmit = true
): z.infer<typeof CaptureStateSchema> {
  switch (state) {
    case "idle":
      if (event === "start_capture") return "listening";
      if (event === "reset") return "idle";
      return state;
    case "listening":
      if (event === "stop_capture") return "transcribing";
      if (event === "cancel") return "idle";
      if (event === "capture_error") return "error";
      return state;
    case "transcribing":
      if (event === "final_transcript_auto_submit")
        return autoSubmit ? "thinking" : "ready_to_send";
      if (event === "final_transcript_manual_review") return "ready_to_send";
      if (event === "cancel") return "idle";
      if (event === "transcription_error") return "error";
      return state;
    case "ready_to_send":
      if (event === "submit") return "thinking";
      if (event === "cancel") return "idle";
      return state;
    case "thinking":
      if (event === "answer_started") return "answering";
      if (event === "answer_received") return "idle";
      if (event === "answer_error") return "error";
      return state;
    case "answering":
      if (event === "answer_received") return "idle";
      if (event === "answer_error") return "error";
      return state;
    case "error":
      if (event === "reset") return "idle";
      if (event === "start_capture") return "listening";
      return state;
  }
}

export function summarizeTurnTiming(
  timing: TurnTiming,
  transcriptChars: number,
  answerChars: number
): TurnMetrics {
  const captureToTranscriptMs =
    timing.captureStartedAtMs !== undefined && timing.transcriptFinalAtMs !== undefined
      ? Math.round(timing.transcriptFinalAtMs - timing.captureStartedAtMs)
      : null;
  const transcriptToAnswerMs =
    timing.transcriptFinalAtMs !== undefined && timing.answerReceivedAtMs !== undefined
      ? Math.round(timing.answerReceivedAtMs - timing.transcriptFinalAtMs)
      : null;
  const totalMs =
    timing.captureStartedAtMs !== undefined && timing.answerReceivedAtMs !== undefined
      ? Math.round(timing.answerReceivedAtMs - timing.captureStartedAtMs)
      : null;

  return {
    turnId: timing.turnId,
    transcriptChars,
    answerChars,
    captureToTranscriptMs,
    transcriptToAnswerMs,
    totalMs
  };
}
