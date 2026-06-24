import type { CaptureState } from "@meeting-copilot/contracts";

export function StateIndicator({
  state,
  labels
}: {
  state: CaptureState;
  labels: Record<string, string>;
}) {
  return (
    <div className={`state-indicator state-${state}`} aria-live="polite">
      <span className="state-dot" />
      {labels[state]}
    </div>
  );
}
