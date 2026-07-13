import type { OverlayVisualState } from "@meeting-copilot/contracts";

export function OverlayStatus({
  state,
  labels,
  captureActive
}: {
  state: OverlayVisualState;
  labels: Record<string, string>;
  captureActive: boolean;
}) {
  return (
    <div
      className={`overlay-state overlay-state-${state}`}
      role="status"
      aria-live={state === "error" || state === "answer_ready" ? "assertive" : "polite"}
      aria-label={`${labels[state] ?? state}. ${captureActive ? "Capture active" : "Capture inactive"}`}
    >
      <span className="capture-dot" aria-hidden="true" />
      <span>{labels[state] ?? state}</span>
      <span className="capture-state-text">{captureActive ? "REC" : "OFF"}</span>
    </div>
  );
}
