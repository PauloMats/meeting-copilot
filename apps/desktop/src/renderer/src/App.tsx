import type { CSSProperties } from "react";
import { AnswerCard } from "./components/AnswerCard";
import { SourcePicker } from "./components/SourcePicker";
import { StateIndicator } from "./components/StateIndicator";
import { useCopilot } from "./hooks/use-copilot";
import { getMessages, languages } from "./i18n";

export function App() {
  const copilot = useCopilot();
  const canEdit = copilot.state === "ready_to_send" && !copilot.settings.autoSubmit;
  const isOverlay = copilot.settings.overlayEnabled;
  const overlayOpacity = copilot.settings.overlayOpacity;
  const isLightOverlayText = copilot.settings.overlayTextTheme === "light";
  const t = getMessages(copilot.settings.language);
  const overlayStyle = {
    "--overlay-shell-opacity": Math.max(0.02, overlayOpacity - 0.42).toFixed(2),
    "--overlay-chip-opacity": Math.min(0.88, overlayOpacity + 0.08).toFixed(2),
    "--overlay-card-opacity": Math.min(0.92, overlayOpacity + 0.2).toFixed(2),
    "--overlay-field-opacity": Math.min(0.94, overlayOpacity + 0.12).toFixed(2),
    "--overlay-border-opacity": Math.min(0.48, overlayOpacity + 0.06).toFixed(2),
    "--overlay-shell-rgb": isLightOverlayText ? "4, 8, 14" : "245, 248, 255",
    "--overlay-surface-rgb": isLightOverlayText ? "8, 13, 21" : "246, 249, 255",
    "--overlay-field-rgb": isLightOverlayText ? "5, 9, 15" : "255, 255, 255",
    "--overlay-text-color": isLightOverlayText ? "#edf4ff" : "#07111f",
    "--overlay-heading-color": isLightOverlayText ? "#ffffff" : "#06101f",
    "--overlay-muted-color": isLightOverlayText ? "#cbd7e8" : "#263247",
    "--overlay-text-shadow": copilot.settings.overlayTextShadow
      ? isLightOverlayText
        ? "0 2px 8px rgba(0, 0, 0, 0.72)"
        : "0 1px 5px rgba(255, 255, 255, 0.68)"
      : "none"
  } as CSSProperties;

  return (
    <main className={`app-shell ${isOverlay ? "overlay-shell" : ""}`} style={overlayStyle}>
      <header className="topbar">
        {isOverlay ? (
          <button
            className="secondary compact-button overlay-exit"
            onClick={() => void copilot.updateSettings({ overlayEnabled: false })}
          >
            {t.exitOverlay}
          </button>
        ) : (
          <>
            <div>
              <p className="eyebrow">{t.appTitle}</p>
              <h1>{t.hero}</h1>
            </div>
            <div className="topbar-actions">
              <StateIndicator state={copilot.state} labels={t.states} />
            </div>
          </>
        )}
      </header>

      {isOverlay ? (
        <section className="overlay-status" aria-label="Overlay controls">
          <StateIndicator state={copilot.state} labels={t.states} />
          <span>
            {t.hold} <kbd>{copilot.settings.hotkey}</kbd>
          </span>
        </section>
      ) : (
        <>
          <section className="control-panel">
            <div className="hotkey">
              <span>{t.holdToListen}</span>
              <kbd>{copilot.settings.hotkey}</kbd>
            </div>
            <SourcePicker label={t.meetingAudioSource} />
            <label className="field">
              {t.language}
              <select
                value={copilot.settings.language}
                onChange={(event) => void copilot.updateSettings({ language: event.target.value })}
              >
                {languages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t.hotkey}
              <select
                value={copilot.settings.hotkey}
                onChange={(event) => void copilot.updateSettings({ hotkey: event.target.value })}
              >
                <option value="Space">Space</option>
                <option value="F8">F8</option>
                <option value="F9">F9</option>
                <option value="F10">F10</option>
              </select>
            </label>
            <label className="field">
              {t.accuracy}
              <select
                value={copilot.settings.transcriptionDelay}
                onChange={(event) =>
                  void copilot.updateSettings({
                    transcriptionDelay:
                      event.target.value as typeof copilot.settings.transcriptionDelay
                  })
                }
              >
                <option value="minimal">{t.fastest}</option>
                <option value="low">{t.fast}</option>
                <option value="medium">{t.balanced}</option>
                <option value="high">{t.accurate}</option>
                <option value="xhigh">{t.mostAccurate}</option>
              </select>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={copilot.settings.includeMicrophone}
                onChange={(event) =>
                  void copilot.updateSettings({ includeMicrophone: event.target.checked })
                }
              />
              {t.includeMicrophone}
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={!copilot.settings.autoSubmit}
                onChange={(event) =>
                  void copilot.updateSettings({ autoSubmit: !event.target.checked })
                }
              />
              {t.reviewBeforeSending}
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={copilot.settings.overlayEnabled}
                onChange={(event) =>
                  void copilot.updateSettings({ overlayEnabled: event.target.checked })
                }
              />
              {t.overlayMode}
            </label>
          </section>

          <details className="settings-panel">
            <summary>{t.settings}</summary>
            <div className="settings-grid">
              <label className="range-field">
                <span>{t.overlayOpacity}</span>
                <input
                  type="range"
                  min="0.08"
                  max="0.92"
                  step="0.02"
                  value={copilot.settings.overlayOpacity}
                  onChange={(event) =>
                    void copilot.updateSettings({
                      overlayOpacity: Number(event.target.value)
                    })
                  }
                />
                <output>{Math.round(copilot.settings.overlayOpacity * 100)}%</output>
              </label>
              <label className="field">
                {t.overlayText}
                <select
                  value={copilot.settings.overlayTextTheme}
                  onChange={(event) =>
                    void copilot.updateSettings({
                      overlayTextTheme:
                        event.target.value as typeof copilot.settings.overlayTextTheme
                    })
                  }
                >
                  <option value="light">{t.lightText}</option>
                  <option value="dark">{t.darkText}</option>
                </select>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={copilot.settings.overlayTextShadow}
                  onChange={(event) =>
                    void copilot.updateSettings({ overlayTextShadow: event.target.checked })
                  }
                />
                {t.overlayTextShadow}
              </label>
            </div>
          </details>
        </>
      )}

      <section className="workspace">
        <div className="transcript-panel">
          <div className="section-heading">
            <h2>{t.transcript}</h2>
            <span>{t.audioNotSaved}</span>
          </div>
          <textarea
            value={copilot.transcript}
            readOnly={!canEdit}
            placeholder={t.holdPlaceholder(copilot.settings.hotkey)}
            onChange={(event) => copilot.setTranscript(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canEdit) {
                event.preventDefault();
                void copilot.submit();
              }
              if (event.key === "Escape") void copilot.cancel();
            }}
          />
          {canEdit && (
            <div className="review-actions">
              <button className="secondary" onClick={() => void copilot.cancel()}>
                {t.cancel}
              </button>
              <button onClick={() => void copilot.submit()}>{t.sendAnswer}</button>
            </div>
          )}
          {copilot.error && <p className="error-message">{copilot.error}</p>}
        </div>

        <div className="answer-panel">
          {copilot.answer ? (
            <AnswerCard
              answer={copilot.answer}
              labels={{
                answer: t.answer,
                why: t.why,
                example: t.example,
                assumptions: t.assumptions,
                confidence: t.confidence
              }}
            />
          ) : (
            <div className="empty-answer">
              <div className="pulse-ring" />
              <h2>{t.answerPlaceholderTitle}</h2>
              <p>{t.answerPlaceholderBody}</p>
            </div>
          )}
        </div>
      </section>

      {!isOverlay && (
        <footer>
          <span>{t.pushToTalkOnly}</span>
          <span>{t.ephemeralCredentials}</span>
          <span>{t.localSettings}</span>
        </footer>
      )}
    </main>
  );
}
