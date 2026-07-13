import type { UiError } from "@meeting-copilot/contracts";

export function classifyUiError(cause: unknown): UiError {
  const message =
    cause instanceof Error
      ? `${cause.name} ${cause.message}`
      : typeof cause === "string"
        ? cause
        : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("permission") || normalized.includes("notallowederror")) {
    return error(
      "permission_denied",
      "Audio permission was denied",
      "Capture did not start.",
      "Your current transcript and answer were preserved.",
      "Allow microphone/screen audio access in Windows and try again."
    );
  }
  if (
    normalized.includes("no audio") ||
    normalized.includes("audio track") ||
    normalized.includes("notfounderror")
  ) {
    return error(
      "no_audio",
      "No meeting audio is available",
      "The app cannot transcribe this turn.",
      "No audio was saved or sent for this failed capture.",
      "Choose another screen/window source and verify that it is playing audio."
    );
  }
  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return error(
      "rate_limit",
      "The AI service is busy",
      "The answer was not generated.",
      "The finalized question remains available for retry.",
      "Wait a moment, choose Basic intelligence, and retry."
    );
  }
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return error(
      "timeout",
      "The service took too long",
      "This turn did not finish.",
      "The current question remains available.",
      "Check the connection and retry."
    );
  }
  if (
    normalized.includes("fetch") ||
    normalized.includes("network") ||
    normalized.includes("503") ||
    normalized.includes("502") ||
    normalized.includes("backend")
  ) {
    return error(
      "offline",
      "The Meeting Copilot API is offline",
      "Transcription tokens or answers cannot be requested.",
      "Local settings and the current text were preserved.",
      "Check the Railway/API status and your internet connection, then retry."
    );
  }
  if (normalized.includes("cancel")) {
    return {
      kind: "cancelled",
      title: "Turn cancelled",
      impact: "No new answer will be shown.",
      preserved: "Pinned answers remain available.",
      action: "Start a new capture when ready.",
      retryable: false
    };
  }

  return error(
    "unexpected",
    "Something went wrong",
    "The current operation could not finish.",
    "Local settings and pinned answers were preserved.",
    "Try again. If it repeats, copy the safe diagnostic report."
  );
}

function error(
  kind: UiError["kind"],
  title: string,
  impact: string,
  preserved: string,
  action: string
): UiError {
  return { kind, title, impact, preserved, action, retryable: true };
}
