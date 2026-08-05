import type { AudioDevice, MeetingType, SpeakerSegment } from "@meeting-copilot/contracts";
import { useState } from "react";
import { SourcePicker } from "./SourcePicker";
import { StateIndicator } from "./StateIndicator";
import { MeetingResultCard } from "./MeetingResultCard";
import { MeetingExportMenu } from "./MeetingExportMenu";
import { useMeetingNotes } from "../hooks/use-meeting-notes";
import { languages } from "../i18n";
import { WindowTitleBar } from "./WindowTitleBar";

export function MeetingNotes({ onBack }: { onBack: () => void }) {
  const notes = useMeetingNotes();
  const [selectedSource, setSelectedSource] = useState<AudioDevice | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("general_meeting");
  const [meetingName, setMeetingName] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayForInput);
  const pt = notes.settings.language === "pt";
  const isBusy =
    notes.state === "thinking" ||
    Boolean(notes.retryingPath) ||
    (!notes.isRecording && notes.state === "transcribing");
  const stateLabels = {
    idle: pt ? "Pronto" : "Ready",
    listening: notes.isPaused
      ? pt
        ? "Pausada"
        : "Paused"
      : notes.captureMode === "audio_backup"
        ? pt
          ? "Salvando áudio"
          : "Saving audio"
        : pt
          ? "Gravando"
          : "Recording",
    transcribing: notes.isPaused
      ? pt
        ? "Pausada"
        : "Paused"
      : pt
        ? "Transcrevendo"
        : "Transcribing",
    ready_to_send: pt ? "Revisar participantes" : "Review participants",
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

      <section className="meeting-type-panel">
        <div className="meeting-type-heading">
          <div>
            <p className="eyebrow">{pt ? "TIPO DE REUNIÃO" : "MEETING TYPE"}</p>
            <h2>
              {pt
                ? "Como a IA deve organizar esta conversa?"
                : "How should AI organize this conversation?"}
            </h2>
          </div>
          <span>{pt ? "Escolha antes de gravar" : "Choose before recording"}</span>
        </div>
        <div className="meeting-type-options" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={meetingType === "general_meeting"}
            className={meetingType === "general_meeting" ? "is-selected" : ""}
            disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
            onClick={() => setMeetingType("general_meeting")}
          >
            <span className="meeting-type-icon" aria-hidden="true">
              ≡
            </span>
            <span>
              <strong>{pt ? "Reunião geral" : "General meeting"}</strong>
              <small>
                {pt
                  ? "Decisões, tópicos, tarefas, responsáveis e questões em aberto."
                  : "Decisions, topics, tasks, owners, and open questions."}
              </small>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={meetingType === "daily"}
            className={meetingType === "daily" ? "is-selected" : ""}
            disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
            onClick={() => setMeetingType("daily")}
          >
            <span className="meeting-type-icon" aria-hidden="true">
              ↗
            </span>
            <span>
              <strong>{pt ? "Daily / Status do time" : "Daily / Team status"}</strong>
              <small>
                {pt
                  ? "Atualizações individuais, andamento, bloqueios, dependências e próximos passos."
                  : "Individual updates, progress, blockers, dependencies, and next steps."}
              </small>
            </span>
          </button>
        </div>
      </section>

      {meetingType === "daily" && (
        <DailyConfiguration
          portuguese={pt}
          disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
          meetingName={meetingName}
          meetingDate={meetingDate}
          onMeetingNameChange={setMeetingName}
          onMeetingDateChange={setMeetingDate}
        />
      )}

      <section className="control-panel notes-controls">
        <SourcePicker
          label={pt ? "Saída de áudio do Windows" : "Windows audio output"}
          disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
          requireExplicitSelection
          emptyLabel={pt ? "Selecione o dispositivo…" : "Select the output device…"}
          unavailableLabel={pt ? "Nenhuma saída de áudio encontrada" : "No audio output found"}
          onSelectionChange={setSelectedSource}
        />
        <label className="field">
          {pt ? "Idioma" : "Language"}
          <select
            value={notes.settings.language}
            disabled={notes.isRecording || notes.isDailyReviewPending}
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
            disabled={notes.isRecording || notes.isDailyReviewPending}
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
            disabled={notes.isRecording || notes.isDailyReviewPending}
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
            {notes.isPaused
              ? pt
                ? "Captura pausada"
                : "Capture paused"
              : notes.isRecording
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
            active={notes.isRecording && !notes.isPaused}
            enabled={Boolean(selectedSource)}
            pt={pt}
          />
          <AudioLevelMeter
            label={pt ? "Microfone" : "Microphone"}
            level={notes.audioLevels.microphone ?? 0}
            active={notes.isRecording && !notes.isPaused}
            enabled={notes.settings.includeMicrophone}
            pt={pt}
          />
        </div>
      </section>

      <section
        className={`recording-console ${notes.isRecording ? "is-recording" : ""} ${
          notes.isPaused ? "is-paused" : ""
        }`}
      >
        <div className="recording-copy">
          <span className="recording-kicker">
            {notes.isPaused
              ? pt
                ? "GRAVAÇÃO PAUSADA"
                : "RECORDING PAUSED"
              : notes.isRecording
                ? notes.captureMode === "audio_backup"
                  ? pt
                    ? "GRAVAÇÃO DE SEGURANÇA"
                    : "SAFETY RECORDING"
                  : pt
                    ? "GRAVAÇÃO EM ANDAMENTO"
                    : "RECORDING IN PROGRESS"
                : notes.isDailyReviewPending
                  ? pt
                    ? "REVISÃO DA DAILY"
                    : "DAILY REVIEW"
                  : pt
                    ? "PRONTO PARA COMEÇAR"
                    : "READY TO START"}
          </span>
          <h2>
            {notes.isPaused
              ? pt
                ? "Este trecho não está sendo transcrito"
                : "This part is not being transcribed"
              : notes.isRecording
                ? notes.captureMode === "audio_backup"
                  ? pt
                    ? "O áudio está sendo preservado localmente"
                    : "Audio is being preserved locally"
                  : pt
                    ? "Estou ouvindo a reunião"
                    : "Listening to your meeting"
                : notes.isDailyReviewPending
                  ? pt
                    ? "Revise as pessoas antes de enviar"
                    : "Review speakers before sending"
                  : isBusy
                    ? pt
                      ? "Organizando suas anotações"
                      : "Organizing your notes"
                    : pt
                      ? "Um clique inicia. Outro finaliza."
                      : "One click starts. Another finishes."}
          </h2>
          <p>
            {notes.isPaused
              ? pt
                ? "Retome quando a conversa voltar a ser relevante."
                : "Resume when the conversation becomes relevant again."
              : notes.isRecording
                ? notes.captureMode === "audio_backup"
                  ? pt
                    ? "Sem créditos, não há transcrição ao vivo. Ao finalizar, o arquivo WAV será salvo para recuperação posterior."
                    : "Without API credits, live transcription is unavailable. The WAV file will be saved for later recovery when you finish."
                  : pt
                    ? "A transcrição aparece abaixo em tempo real."
                    : "The transcript appears below in real time."
                : notes.isDailyReviewPending
                  ? pt
                    ? "Edite os nomes e os trechos abaixo. A IA só será chamada quando você confirmar."
                    : "Edit names and segments below. AI is called only after you confirm."
                  : pt
                    ? meetingType === "daily"
                      ? "Durante a gravação, avance manualmente quando a próxima pessoa começar."
                      : "Ao finalizar, a transcrição será salva e resumida pela IA."
                    : meetingType === "daily"
                      ? "During recording, advance manually when the next person starts."
                      : "When finished, the transcript is saved and summarized by AI."}
          </p>
          {notes.isRecording &&
            notes.captureMode === "live_transcription" &&
            meetingType === "daily" && (
              <div className="active-daily-speaker">
                <span>{pt ? "FALANDO AGORA" : "SPEAKING NOW"}</span>
                <strong>
                  {pt ? "Pessoa" : "Person"} {notes.activeDailySegmentIndex + 1}
                </strong>
              </div>
            )}
        </div>
        <div className="recording-actions">
          {notes.isRecording &&
            notes.captureMode === "live_transcription" &&
            meetingType === "daily" && (
              <button
                className="secondary next-speaker-button"
                disabled={
                  notes.isPaused ||
                  !notes.dailySegments[notes.activeDailySegmentIndex]?.transcript.trim()
                }
                onClick={notes.nextDailySpeaker}
              >
                {pt ? "Próxima pessoa" : "Next person"} →
              </button>
            )}
          {notes.isRecording && (
            <button
              className={`secondary pause-button ${notes.isPaused ? "resume-button" : ""}`}
              onClick={() =>
                void (notes.isPaused ? notes.resumeRecording() : notes.pauseRecording())
              }
            >
              <span aria-hidden="true">{notes.isPaused ? "▶" : "Ⅱ"}</span>
              {notes.isPaused ? (pt ? "Retomar" : "Resume") : pt ? "Pausar" : "Pause"}
            </button>
          )}
          <button
            className={`record-button ${notes.isRecording ? "record-button-stop" : ""}`}
            disabled={
              isBusy || notes.isDailyReviewPending || (!notes.isRecording && !selectedSource)
            }
            onClick={() =>
              void (notes.isRecording
                ? notes.stopRecording()
                : notes.startRecording({
                    meetingType,
                    meetingName: meetingName.trim(),
                    meetingDate: meetingDate.trim(),
                    orderedParticipants: [],
                    speakerHints: [],
                    speakerSegments: []
                  }))
            }
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
        </div>
        <div className="recording-timer">{formatDuration(notes.elapsedSeconds)}</div>
      </section>

      {notes.recordingWarning && (
        <p className="recording-warning" role="status">
          {notes.recordingWarning}
        </p>
      )}
      {notes.error && <p className="error-message notes-error">{notes.error}</p>}
      {notes.audioBackupPath && notes.audioBackupNoticeVisible && (
        <div className="saved-note audio-backup-note">
          <span>
            ✓ {pt ? "Áudio de segurança salvo em" : "Safety audio saved to"}{" "}
            <strong>{notes.audioBackupPath}</strong>
          </span>
          <div className="saved-note-actions">
            <button
              className="secondary compact-button"
              onClick={() => void window.copilot.capture.revealBackup(notes.audioBackupPath!)}
            >
              {pt ? "Mostrar áudio" : "Show audio"}
            </button>
            <button
              className="saved-note-dismiss"
              aria-label={pt ? "Fechar aviso" : "Dismiss notification"}
              title={pt ? "Fechar aviso" : "Dismiss notification"}
              onClick={notes.dismissAudioBackup}
            >
              ×
            </button>
          </div>
        </div>
      )}
      {notes.savedPath && notes.savedNoticeVisible && (
        <div className="saved-note">
          <span>
            ✓ {pt ? "Ata salva em" : "Notes saved to"} <strong>{notes.savedPath}</strong>
          </span>
          <div className="saved-note-actions">
            <button
              className="secondary compact-button"
              onClick={() => void window.copilot.meetingNotes.reveal(notes.savedPath!)}
            >
              {pt ? "Mostrar arquivo" : "Show file"}
            </button>
            <button
              className="saved-note-dismiss"
              aria-label={pt ? "Fechar aviso" : "Dismiss notification"}
              title={pt ? "Fechar aviso" : "Dismiss notification"}
              onClick={notes.dismissSavedPath}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {notes.isDailyReviewPending && (
        <DailySpeakerReview
          portuguese={pt}
          segments={notes.dailySegments}
          submitting={notes.state === "thinking"}
          onChange={notes.updateDailySegment}
          onSubmit={() => void notes.submitDailySummary()}
        />
      )}

      <section className="saved-transcripts">
        <div className="saved-transcripts-heading">
          <div>
            <p className="eyebrow">{pt ? "TRANSCRIÇÕES SALVAS" : "SAVED TRANSCRIPTS"}</p>
            <h2>{pt ? "Reenvie uma reunião anterior" : "Retry a previous meeting"}</h2>
            <p>
              {pt
                ? "As atas ficam em Documentos/Meeting Copilot. O reenvio atualiza o mesmo arquivo."
                : "Notes stay in Documents/Meeting Copilot. Retrying updates the same file."}
            </p>
          </div>
          <button
            className="secondary compact-button"
            disabled={notes.isLoadingSavedNotes}
            onClick={() => void notes.refreshSavedNotes()}
          >
            ↻ {pt ? "Atualizar" : "Refresh"}
          </button>
        </div>
        {notes.isLoadingSavedNotes ? (
          <p className="saved-transcripts-empty">
            {pt ? "Carregando transcrições…" : "Loading transcripts…"}
          </p>
        ) : notes.savedNotes.length === 0 ? (
          <p className="saved-transcripts-empty">
            {pt ? "Nenhuma transcrição salva foi encontrada." : "No saved transcripts were found."}
          </p>
        ) : (
          <div className="saved-transcript-list">
            {notes.savedNotes.map((entry) => {
              const retrying = notes.retryingPath === entry.filePath;
              return (
                <article className="saved-transcript-item" key={entry.filePath}>
                  <div className="saved-transcript-copy">
                    <div className="saved-transcript-title">
                      <strong>{entry.title}</strong>
                      <span className="meeting-type-badge">
                        {entry.meetingType === "daily" ? "Daily" : pt ? "Geral" : "General"}
                      </span>
                      <span className={entry.hasSummary ? "has-summary" : "needs-summary"}>
                        {entry.hasSummary
                          ? pt
                            ? "Resumo pronto"
                            : "Summary ready"
                          : pt
                            ? "Aguardando resumo"
                            : "Needs summary"}
                      </span>
                      {entry.hasSummary && !entry.hasStructuredResult && (
                        <span
                          className="legacy-summary"
                          title={
                            pt
                              ? "Gere novamente para habilitar as exportações da v0.5."
                              : "Generate again to enable v0.5 exports."
                          }
                        >
                          {pt ? "Exportação pendente" : "Export pending"}
                        </span>
                      )}
                    </div>
                    <time dateTime={entry.startedAt}>{formatMeetingDate(entry.startedAt, pt)}</time>
                    <p>{entry.transcriptPreview}</p>
                  </div>
                  <div className="saved-transcript-actions">
                    <MeetingExportMenu
                      filePath={entry.filePath}
                      structuredResultAvailable={entry.hasStructuredResult}
                      disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
                      portuguese={pt}
                      compact
                    />
                    <button
                      className="secondary compact-button"
                      onClick={() => void window.copilot.meetingNotes.reveal(entry.filePath)}
                    >
                      {pt ? "Mostrar arquivo" : "Show file"}
                    </button>
                    <button
                      className="compact-button retry-summary-button"
                      disabled={notes.isRecording || isBusy || notes.isDailyReviewPending}
                      onClick={() => void notes.retrySavedNote(entry)}
                    >
                      {retrying
                        ? pt
                          ? "Enviando…"
                          : "Sending…"
                        : entry.hasSummary
                          ? pt
                            ? "Gerar novamente"
                            : "Generate again"
                          : pt
                            ? "Gerar resumo"
                            : "Generate summary"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="notes-workspace">
        <div className="transcript-panel notes-transcript">
          <div className="section-heading">
            <h2>{pt ? "Transcrição ao vivo" : "Live transcript"}</h2>
            <span>
              {notes.captureMode === "audio_backup"
                ? pt
                  ? "Modo backup: áudio local"
                  : "Backup mode: local audio"
                : pt
                  ? "Áudio não salvo"
                  : "Audio is not saved"}
            </span>
          </div>
          <textarea
            readOnly
            value={notes.transcript}
            placeholder={
              notes.captureMode === "audio_backup"
                ? pt
                  ? "Transcrição indisponível sem créditos. O áudio continuará sendo gravado."
                  : "Transcription is unavailable without credits. Audio recording will continue."
                : pt
                  ? "A conversa transcrita aparecerá aqui…"
                  : "The transcribed conversation will appear here…"
            }
          />
        </div>
        <div className="answer-panel notes-summary">
          {notes.summary ? (
            <>
              <div className="notes-summary-toolbar">
                <div>
                  <span className="notes-summary-ready">
                    <span aria-hidden="true">✓</span>
                    {pt ? "Ata organizada e pronta" : "Meeting notes ready"}
                  </span>
                  <small>
                    {pt
                      ? "A exportação usa o resultado salvo e não consome IA novamente."
                      : "Export uses the saved result and does not call AI again."}
                  </small>
                </div>
                <MeetingExportMenu
                  filePath={notes.savedPath}
                  structuredResultAvailable={notes.summaryExportReady}
                  disabled={isBusy}
                  portuguese={pt}
                />
              </div>
              <MeetingResultCard
                result={notes.summary}
                meetingType={notes.summaryMeetingType}
                portuguese={pt}
              />
            </>
          ) : (
            <div className="empty-answer">
              <div className={isBusy ? "summary-loader" : "pulse-ring"} />
              <h2>
                {isBusy
                  ? pt
                    ? meetingType === "daily"
                      ? "Criando o relatório da Daily…"
                      : "Criando a ata da reunião…"
                    : meetingType === "daily"
                      ? "Creating the daily status report…"
                      : "Creating meeting notes…"
                  : pt
                    ? "O resumo aparecerá aqui"
                    : "Your summary will appear here"}
              </h2>
              <p>
                {pt
                  ? meetingType === "daily"
                    ? "Atualizações, bloqueios, dependências e próximos passos por participante."
                    : "Tópicos, decisões, tarefas e próximos passos em um só lugar."
                  : meetingType === "daily"
                    ? "Updates, blockers, dependencies, and next steps by participant."
                    : "Topics, decisions, tasks, and next steps in one place."}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DailyConfiguration({
  portuguese,
  disabled,
  meetingName,
  meetingDate,
  onMeetingNameChange,
  onMeetingDateChange
}: {
  portuguese: boolean;
  disabled: boolean;
  meetingName: string;
  meetingDate: string;
  onMeetingNameChange: (value: string) => void;
  onMeetingDateChange: (value: string) => void;
}) {
  return (
    <section className="daily-configuration">
      <div className="daily-configuration-heading">
        <div>
          <p className="eyebrow">{portuguese ? "FLUXO DA DAILY" : "DAILY FLOW"}</p>
          <h2>
            {portuguese
              ? "Você controla quando cada pessoa começa a falar"
              : "You control when each person starts speaking"}
          </h2>
        </div>
        <small>
          {portuguese
            ? "Começa em Pessoa 1. Use “Próxima pessoa” durante a gravação e informe os nomes na revisão."
            : "Starts at Person 1. Use “Next person” while recording, then enter names during review."}
        </small>
      </div>
      <div className="daily-fields">
        <label className="daily-field">
          <span>{portuguese ? "Nome da Daily" : "Daily name"}</span>
          <input
            value={meetingName}
            disabled={disabled}
            maxLength={160}
            placeholder={portuguese ? "Ex.: Daily Dourado" : "E.g. Product daily"}
            onChange={(event) => onMeetingNameChange(event.target.value)}
          />
        </label>
        <label className="daily-field daily-date-field">
          <span>{portuguese ? "Data" : "Date"}</span>
          <input
            type="date"
            value={meetingDate}
            disabled={disabled}
            onChange={(event) => onMeetingDateChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

function DailySpeakerReview({
  portuguese,
  segments,
  submitting,
  onChange,
  onSubmit
}: {
  portuguese: boolean;
  segments: SpeakerSegment[];
  submitting: boolean;
  onChange: (
    index: number,
    patch: Partial<Pick<SpeakerSegment, "participant" | "transcript">>
  ) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="daily-review">
      <div className="daily-review-heading">
        <div>
          <p className="eyebrow">{portuguese ? "REVISÃO ANTES DA IA" : "REVIEW BEFORE AI"}</p>
          <h2>
            {portuguese ? "Confirme quem falou cada trecho" : "Confirm who spoke in each segment"}
          </h2>
          <p>
            {portuguese
              ? "A transcrição já está salva localmente. Edite nomes ou texto; o envio só acontece pelo botão abaixo."
              : "The transcript is already saved locally. Edit names or text; submission only happens with the button below."}
          </p>
        </div>
        <span>
          {segments.length} {portuguese ? "pessoas" : "people"}
        </span>
      </div>
      <div className="daily-review-grid">
        {segments.map((segment, index) => (
          <article className="daily-review-card" key={segment.position}>
            <label>
              <span>
                {portuguese ? "Pessoa" : "Person"} {index + 1}
              </span>
              <input
                value={segment.participant}
                maxLength={120}
                placeholder={
                  portuguese ? `Nome da pessoa ${index + 1}` : `Person ${index + 1} name`
                }
                onChange={(event) => onChange(index, { participant: event.target.value })}
              />
            </label>
            <label>
              <span>{portuguese ? "Transcrição" : "Transcript"}</span>
              <textarea
                value={segment.transcript}
                rows={7}
                maxLength={50_000}
                onChange={(event) => onChange(index, { transcript: event.target.value })}
              />
            </label>
          </article>
        ))}
      </div>
      <div className="daily-review-submit">
        <small>
          {portuguese
            ? "Os nomes informados serão tratados como atribuição manual confiável."
            : "Entered names are treated as trusted manual attribution."}
        </small>
        <button
          disabled={submitting || !segments.some((segment) => segment.transcript.trim())}
          onClick={onSubmit}
        >
          {submitting
            ? portuguese
              ? "Enviando…"
              : "Sending…"
            : portuguese
              ? "Enviar para IA e resumir"
              : "Send to AI and summarize"}
        </button>
      </div>
    </section>
  );
}

function todayForInput(): string {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
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

function formatMeetingDate(value: string, portuguese: boolean): string {
  return new Intl.DateTimeFormat(portuguese ? "pt-BR" : "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
