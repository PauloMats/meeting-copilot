import type { AudioDevice } from "@meeting-copilot/contracts";
import { useState } from "react";
import { SourcePicker } from "./SourcePicker";
import { StateIndicator } from "./StateIndicator";
import { MeetingSummaryCard } from "./MeetingSummaryCard";
import { useMeetingNotes } from "../hooks/use-meeting-notes";
import { languages } from "../i18n";
import { WindowTitleBar } from "./WindowTitleBar";

export function MeetingNotes({ onBack }: { onBack: () => void }) {
  const notes = useMeetingNotes();
  const [selectedSource, setSelectedSource] = useState<AudioDevice | null>(null);
  const pt = notes.settings.language === "pt";
  const isBusy =
    notes.state === "thinking" || (!notes.isRecording && notes.state === "transcribing");
  const stateLabels = {
    idle: pt ? "Pronto" : "Ready",
    listening: pt ? "Gravando" : "Recording",
    transcribing: pt ? "Transcrevendo" : "Transcribing",
    ready_to_send: pt ? "Finalizando" : "Finalizing",
    thinking: pt ? "Criando resumo" : "Creating summary",
    answering: pt ? "Criando resumo" : "Creating summary",
    error: pt ? "Atenção" : "Needs attention"
  };

  const handleBack = async () => {
    try {
      await notes.cancel();
    } finally {
      onBack();
    }
  };

  return (
    <main className="app-shell notes-shell">
      <WindowTitleBar />
      <header className="topbar notes-topbar">
        <div>
          <p className="eyebrow">{pt ? "ANOTAÇÕES INTELIGENTES" : "SMART MEETING NOTES"}</p>
          <h1>
            {pt
              ? "Sua reunião, organizada automaticamente."
              : "Your meeting, organized automatically."}
          </h1>
        </div>
        <div className="topbar-actions">
          <button
            className="secondary compact-button"
            disabled={isBusy}
            onClick={() => void handleBack()}
          >
            ← {pt ? "Início" : "Home"}
          </button>
          <StateIndicator state={notes.state} labels={stateLabels} />
        </div>
      </header>

      <section className="control-panel notes-controls">
        <SourcePicker
          label={pt ? "Saída de áudio do Windows" : "Windows audio output"}
          disabled={notes.isRecording || isBusy}
          requireExplicitSelection
          emptyLabel={pt ? "Selecione o dispositivo…" : "Select the output device…"}
          unavailableLabel={pt ? "Nenhuma saída de áudio encontrada" : "No audio output found"}
          onSelectionChange={setSelectedSource}
        />
        <label className="field">
          {pt ? "Idioma" : "Language"}
          <select
            value={notes.settings.language}
            disabled={notes.isRecording}
            onChange={(event) => void notes.updateSettings({ language: event.target.value })}
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {pt ? "Inteligência" : "Intelligence"}
          <select
            value={notes.settings.intelligenceLevel}
            disabled={notes.isRecording}
            onChange={(event) =>
              void notes.updateSettings({
                intelligenceLevel: event.target.value as typeof notes.settings.intelligenceLevel
              })
            }
          >
            <option value="basic">{pt ? "Básica" : "Basic"}</option>
            <option value="balanced">{pt ? "Balanceada" : "Balanced"}</option>
            <option value="advanced">{pt ? "Avançada" : "Advanced"}</option>
          </select>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            disabled={notes.isRecording}
            checked={notes.settings.includeMicrophone}
            onChange={(event) =>
              void notes.updateSettings({ includeMicrophone: event.target.checked })
            }
          />
          {pt ? "Incluir microfone" : "Include microphone"}
        </label>
      </section>

      {!selectedSource && (
        <p className="source-selection-hint">
          {pt
            ? "Selecione a mesma saída usada pelo Teams, Discord ou navegador — por exemplo, JBL Quantum Game ou Chat."
            : "Select the same output used by Teams, Discord, or your browser — for example, JBL Quantum Game or Chat."}
        </p>
      )}

      <section className="audio-monitor" aria-label={pt ? "Monitor de áudio" : "Audio monitor"}>
        <div className="audio-monitor-heading">
          <div>
            <span>{pt ? "ENTRADAS DE ÁUDIO" : "AUDIO INPUTS"}</span>
            <strong>
              {selectedSource
                ? selectedSource.name
                : pt
                  ? "Saída ainda não selecionada"
                  : "No output selected yet"}
            </strong>
          </div>
          <small>
            {notes.isRecording
              ? pt
                ? "Monitorando em tempo real"
                : "Monitoring in real time"
              : pt
                ? "Os níveis aparecem ao iniciar"
                : "Levels appear when recording starts"}
          </small>
        </div>
        <div className="audio-meter-grid">
          <AudioLevelMeter
            label={pt ? "Áudio do PC" : "System audio"}
            level={notes.audioLevels.system}
            active={notes.isRecording}
            enabled={Boolean(selectedSource)}
            pt={pt}
          />
          <AudioLevelMeter
            label={pt ? "Microfone" : "Microphone"}
            level={notes.audioLevels.microphone ?? 0}
            active={notes.isRecording}
            enabled={notes.settings.includeMicrophone}
            pt={pt}
          />
        </div>
      </section>

      <section className={`recording-console ${notes.isRecording ? "is-recording" : ""}`}>
        <div className="recording-copy">
          <span className="recording-kicker">
            {notes.isRecording
              ? pt
                ? "GRAVAÇÃO EM ANDAMENTO"
                : "RECORDING IN PROGRESS"
              : pt
                ? "PRONTO PARA COMEÇAR"
                : "READY TO START"}
          </span>
          <h2>
            {notes.isRecording
              ? pt
                ? "Estou ouvindo a reunião"
                : "Listening to your meeting"
              : isBusy
                ? pt
                  ? "Organizando suas anotações"
                  : "Organizing your notes"
                : pt
                  ? "Um clique inicia. Outro finaliza."
                  : "One click starts. Another finishes."}
          </h2>
          <p>
            {notes.isRecording
              ? pt
                ? "A transcrição aparece abaixo em tempo real."
                : "The transcript appears below in real time."
              : pt
                ? "Ao finalizar, a transcrição será salva e resumida pela IA."
                : "When finished, the transcript is saved and summarized by AI."}
          </p>
        </div>
        <button
          className={`record-button ${notes.isRecording ? "record-button-stop" : ""}`}
          disabled={isBusy || (!notes.isRecording && !selectedSource)}
          onClick={() => void (notes.isRecording ? notes.stopRecording() : notes.startRecording())}
        >
          <span className="record-button-icon" aria-hidden="true" />
          {notes.isRecording
            ? pt
              ? "Finalizar"
              : "Finish"
            : pt
              ? "Gravar reunião"
              : "Record meeting"}
        </button>
        <div className="recording-timer">{formatDuration(notes.elapsedSeconds)}</div>
      </section>

      {notes.error && <p className="error-message notes-error">{notes.error}</p>}
      {notes.savedPath && (
        <div className="saved-note">
          <span>
            ✓ {pt ? "Ata salva em" : "Notes saved to"} <strong>{notes.savedPath}</strong>
          </span>
          <button
            className="secondary compact-button"
            onClick={() => void window.copilot.meetingNotes.reveal(notes.savedPath!)}
          >
            {pt ? "Mostrar arquivo" : "Show file"}
          </button>
        </div>
      )}

      <section className="notes-workspace">
        <div className="transcript-panel notes-transcript">
          <div className="section-heading">
            <h2>{pt ? "Transcrição ao vivo" : "Live transcript"}</h2>
            <span>{pt ? "Áudio não salvo" : "Audio is not saved"}</span>
          </div>
          <textarea
            readOnly
            value={notes.transcript}
            placeholder={
              pt
                ? "A conversa transcrita aparecerá aqui…"
                : "The transcribed conversation will appear here…"
            }
          />
        </div>
        <div className="answer-panel notes-summary">
          {notes.summary ? (
            <MeetingSummaryCard summary={notes.summary} portuguese={pt} />
          ) : (
            <div className="empty-answer">
              <div className={isBusy ? "summary-loader" : "pulse-ring"} />
              <h2>
                {isBusy
                  ? pt
                    ? "Criando a ata da reunião…"
                    : "Creating meeting notes…"
                  : pt
                    ? "O resumo aparecerá aqui"
                    : "Your summary will appear here"}
              </h2>
              <p>
                {pt
                  ? "Tópicos, decisões, tarefas e próximos passos em um só lugar."
                  : "Topics, decisions, tasks, and next steps in one place."}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AudioLevelMeter({
  label,
  level,
  active,
  enabled,
  pt
}: {
  label: string;
  level: number;
  active: boolean;
  enabled: boolean;
  pt: boolean;
}) {
  const percentage = Math.round(Math.max(0, Math.min(1, level)) * 100);
  const hasSignal = percentage >= 3;
  const status = !enabled
    ? pt
      ? "Desativado"
      : "Disabled"
    : !active
      ? pt
        ? "Pronto"
        : "Ready"
      : hasSignal
        ? pt
          ? "Sinal detectado"
          : "Signal detected"
        : pt
          ? "Aguardando sinal"
          : "Waiting for signal";

  return (
    <div className={`audio-meter ${enabled ? "is-enabled" : "is-disabled"}`}>
      <div className="audio-meter-label">
        <span>{label}</span>
        <small>{status}</small>
      </div>
      <div
        className="audio-meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <span className="audio-meter-fill" style={{ width: `${enabled ? percentage : 0}%` }} />
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
