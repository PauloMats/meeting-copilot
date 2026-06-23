import type { CSSProperties } from "react";
import { AnswerCard } from "./components/AnswerCard";
import { SourcePicker } from "./components/SourcePicker";
import { StateIndicator } from "./components/StateIndicator";
import { useCopilot } from "./hooks/use-copilot";

export function App() {
  const copilot = useCopilot();
  const canEdit = copilot.state === "ready_to_send" && !copilot.settings.autoSubmit;
  const isOverlay = copilot.settings.overlayEnabled;
  const overlayOpacity = copilot.settings.overlayOpacity;
  const isLightOverlayText = copilot.settings.overlayTextTheme === "light";
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
        <div>
          <p className="eyebrow">MEETING COPILOT</p>
          <h1>
            {isOverlay
              ? "Live meeting overlay"
              : "Technical answers, without breaking the conversation."}
          </h1>
        </div>
        <div className="topbar-actions">
          <StateIndicator state={copilot.state} />
          {isOverlay && (
            <button
              className="secondary compact-button"
              onClick={() => void copilot.updateSettings({ overlayEnabled: false })}
            >
              Exit overlay
            </button>
          )}
        </div>
      </header>

      {isOverlay ? (
        <section className="overlay-strip" aria-label="Overlay controls">
          <span>
            Hold <kbd>{copilot.settings.hotkey}</kbd>
          </span>
          <span>{copilot.settings.includeMicrophone ? "Mic included" : "Meeting audio only"}</span>
          <span>Audio not saved</span>
        </section>
      ) : (
        <>
          <section className="control-panel">
            <div className="hotkey">
              <span>Hold to listen</span>
              <kbd>{copilot.settings.hotkey}</kbd>
            </div>
            <SourcePicker />
            <label className="field">
              Language
              <select
                value={copilot.settings.language}
                onChange={(event) => void copilot.updateSettings({ language: event.target.value })}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="field">
              Hotkey
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
              Accuracy
              <select
                value={copilot.settings.transcriptionDelay}
                onChange={(event) =>
                  void copilot.updateSettings({
                    transcriptionDelay:
                      event.target.value as typeof copilot.settings.transcriptionDelay
                  })
                }
              >
                <option value="minimal">Fastest</option>
                <option value="low">Fast</option>
                <option value="medium">Balanced</option>
                <option value="high">Accurate</option>
                <option value="xhigh">Most accurate</option>
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
              Include microphone
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={!copilot.settings.autoSubmit}
                onChange={(event) =>
                  void copilot.updateSettings({ autoSubmit: !event.target.checked })
                }
              />
              Review before sending
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={copilot.settings.overlayEnabled}
                onChange={(event) =>
                  void copilot.updateSettings({ overlayEnabled: event.target.checked })
                }
              />
              Overlay mode
            </label>
          </section>

          <details className="settings-panel">
            <summary>Settings</summary>
            <div className="settings-grid">
              <label className="range-field">
                <span>Overlay opacity</span>
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
                Overlay text
                <select
                  value={copilot.settings.overlayTextTheme}
                  onChange={(event) =>
                    void copilot.updateSettings({
                      overlayTextTheme:
                        event.target.value as typeof copilot.settings.overlayTextTheme
                    })
                  }
                >
                  <option value="light">Light text</option>
                  <option value="dark">Dark text</option>
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
                Overlay text shadow
              </label>
            </div>
          </details>
        </>
      )}

      <section className="workspace">
        <div className="transcript-panel">
          <div className="section-heading">
            <h2>Transcript</h2>
            <span>Audio is not saved</span>
          </div>
          <textarea
            value={copilot.transcript}
            readOnly={!canEdit}
            placeholder={`Hold ${copilot.settings.hotkey} while someone asks a technical question…`}
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
                Cancel
              </button>
              <button onClick={() => void copilot.submit()}>Send answer</button>
            </div>
          )}
          {copilot.error && <p className="error-message">{copilot.error}</p>}
        </div>

        <div className="answer-panel">
          {copilot.answer ? (
            <AnswerCard answer={copilot.answer} />
          ) : (
            <div className="empty-answer">
              <div className="pulse-ring" />
              <h2>Your answer will appear here</h2>
              <p>Direct response first, explanation and example underneath.</p>
            </div>
          )}
        </div>
      </section>

      {!isOverlay && (
        <footer>
          <span>Push-to-talk only</span>
          <span>Ephemeral transcription credentials</span>
          <span>Local settings</span>
        </footer>
      )}
    </main>
  );
}
