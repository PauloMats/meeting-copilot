import type { useCopilot } from "../hooks/use-copilot";
import { getMessages } from "../i18n";
import { getOperationalMessages } from "../operational-i18n";
import { AsyncIconButton } from "./AsyncIconButton";
import { ErrorState } from "./ErrorState";
import { OverlayStatus } from "./OverlayStatus";
import { QuickAnswer } from "./QuickAnswer";
import { ReviewSurface } from "./ReviewSurface";

export function OverlayShell({ copilot }: { copilot: ReturnType<typeof useCopilot> }) {
  const t = getMessages(copilot.settings.language);
  const o = getOperationalMessages(copilot.settings.language);
  const mode = copilot.settings.overlayMode;
  const captureActive = copilot.state === "listening";

  if (mode === "minimized") {
    return (
      <main className="overlay-root overlay-minimized drag-region">
        <OverlayStatus
          state={copilot.visualState}
          labels={o.visualStates}
          captureActive={captureActive}
        />
        <div className="overlay-window-actions no-drag">
          <AsyncIconButton
            label={o.expand}
            onClick={() => window.copilot.window.setMode("compact")}
          >
            ↗
          </AsyncIconButton>
        </div>
      </main>
    );
  }

  const expanded = mode === "expanded";
  return (
    <main className={`overlay-root overlay-${mode}`}>
      <header className="overlay-header drag-region">
        <OverlayStatus
          state={copilot.visualState}
          labels={o.visualStates}
          captureActive={captureActive}
        />
        <div className="overlay-window-actions no-drag">
          <AsyncIconButton
            label={copilot.paused ? o.resume : o.pause}
            pressed={copilot.paused}
            onClick={copilot.togglePause}
          >
            {copilot.paused ? "▶" : "Ⅱ"}
          </AsyncIconButton>
          <AsyncIconButton
            label={o.minimize}
            onClick={() => window.copilot.window.setMode("minimized")}
          >
            —
          </AsyncIconButton>
          <AsyncIconButton
            label={expanded ? o.compact : o.expand}
            onClick={() => window.copilot.window.setMode(expanded ? "compact" : "expanded")}
          >
            {expanded ? "↙" : "↗"}
          </AsyncIconButton>
          <AsyncIconButton
            label={o.returnToApp}
            onClick={() => window.copilot.window.setMode("main")}
          >
            ×
          </AsyncIconButton>
        </div>
      </header>

      <div className="overlay-content no-drag">
        {copilot.question && copilot.state !== "ready_to_send" && (
          <section className="question-preview" aria-label={o.detectedQuestion}>
            <div>
              <span>{o.detectedQuestion}</span>
              {copilot.questionWasNormalized && <small>{o.normalizedQuestion}</small>}
            </div>
            <p>{copilot.question}</p>
          </section>
        )}

        {copilot.state === "ready_to_send" && (
          <ReviewSurface
            value={copilot.transcript}
            title={o.reviewTitle}
            hint={o.reviewHint}
            sendLabel={t.sendAnswer}
            discardLabel={o.discard}
            onChange={copilot.setTranscript}
            onSubmit={() => void copilot.submit()}
            onDiscard={copilot.discard}
          />
        )}

        {copilot.error && (
          <ErrorState error={copilot.error} onRetry={() => void copilot.startTurn()} />
        )}

        {copilot.answer ? (
          <QuickAnswer
            answer={copilot.answer}
            copied={copilot.copied}
            pinned={copilot.isPinned}
            expanded={expanded}
            model={copilot.answerMeta?.model}
            onCopy={copilot.copyAnswer}
            onPin={copilot.pinAnswer}
            onDiscard={copilot.discard}
            labels={{
              sayThis: o.sayThis,
              supportPoints: o.supportPoints,
              copy: o.copy,
              copied: o.copied,
              pin: o.pin,
              unpin: o.unpin,
              discard: o.discard,
              details: o.details,
              example: t.example,
              assumptions: t.assumptions,
              followUps: o.followUps,
              model: o.model
            }}
          />
        ) : (
          !copilot.error &&
          copilot.state !== "ready_to_send" && (
            <section className="overlay-empty">
              <p>{o.noAnswer}</p>
              <kbd>{copilot.settings.hotkey}</kbd>
            </section>
          )
        )}

        {expanded && copilot.transcript && (
          <details className="transcript-details">
            <summary>{t.transcript}</summary>
            <p>{copilot.transcript}</p>
          </details>
        )}

        {copilot.pinnedAnswers.length > 0 && (
          <section className="pinned-list">
            <h2>{o.pinnedAnswers}</h2>
            {copilot.pinnedAnswers.map((item) => (
              <article key={item.turnId}>
                <p>{item.answer.sayThis}</p>
                <AsyncIconButton label={o.unpin} onClick={() => copilot.unpin(item.turnId)}>
                  ×
                </AsyncIconButton>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
