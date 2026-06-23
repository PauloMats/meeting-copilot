import type { CaptureState } from "@meeting-copilot/contracts";

const labels: Record<CaptureState, string> = {
  idle: "Ready",
  listening: "Listening",
  transcribing: "Transcribing",
  ready_to_send: "Review",
  thinking: "Thinking",
  answering: "Answering",
  error: "Needs attention"
};

export function StateIndicator({ state }: { state: CaptureState }) {
  return (
    <div className={`state-indicator state-${state}`} aria-live="polite">
      <span className="state-dot" />
      {labels[state]}
    </div>
  );
}
