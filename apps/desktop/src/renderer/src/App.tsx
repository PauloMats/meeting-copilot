import { AnswerCard } from "./components/AnswerCard";
import { SourcePicker } from "./components/SourcePicker";
import { StateIndicator } from "./components/StateIndicator";
import { useCopilot } from "./hooks/use-copilot";

export function App() {
  const copilot = useCopilot();
  const canEdit = copilot.state === "ready_to_send" && !copilot.settings.autoSubmit;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MEETING COPILOT</p>
          <h1>Technical answers, without breaking the conversation.</h1>
        </div>
        <StateIndicator state={copilot.state} />
      </header>

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
                transcriptionDelay: event.target.value as typeof copilot.settings.transcriptionDelay
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
            onChange={(event) => void copilot.updateSettings({ autoSubmit: !event.target.checked })}
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
          Always on top
        </label>
      </section>

      <section className="workspace">
        <div className="transcript-panel">
          <div className="section-heading">
            <h2>Transcript</h2>
            <span>Audio is not saved</span>
          </div>
          <textarea
            value={copilot.transcript}
            readOnly={!canEdit}
            placeholder="Hold Space while someone asks a technical question…"
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

      <footer>
        <span>Push-to-talk only</span>
        <span>Ephemeral transcription credentials</span>
        <span>Local settings</span>
      </footer>
    </main>
  );
}
