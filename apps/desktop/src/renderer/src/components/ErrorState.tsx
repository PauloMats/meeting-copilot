import type { UiError } from "@meeting-copilot/contracts";

export function ErrorState({ error, onRetry }: { error: UiError; onRetry?: () => void }) {
  return (
    <section className="error-state" role="alert">
      <strong>{error.title}</strong>
      <p>{error.impact}</p>
      <small>{error.preserved}</small>
      <p>{error.action}</p>
      {error.retryable && onRetry && (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}
