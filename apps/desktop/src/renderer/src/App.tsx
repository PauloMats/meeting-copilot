import type { AppSettings } from "@meeting-copilot/contracts";
import { useEffect, useState, type CSSProperties } from "react";
import { ErrorState } from "./components/ErrorState";
import { OverlayShell } from "./components/OverlayShell";
import { OverlayStatus } from "./components/OverlayStatus";
import { QuickAnswer } from "./components/QuickAnswer";
import { ReviewSurface } from "./components/ReviewSurface";
import { SourcePicker } from "./components/SourcePicker";
import { useCopilot } from "./hooks/use-copilot";
import { getMessages, languages } from "./i18n";
import { getOperationalMessages, type OperationalMessages } from "./operational-i18n";

type AppView = "meeting" | "history" | "context" | "audio" | "settings" | "diagnostics";
type Copilot = ReturnType<typeof useCopilot>;
type BaseMessages = ReturnType<typeof getMessages>;

export function App() {
  const copilot = useCopilot();
  const [view, setView] = useState<AppView>("meeting");
  const t = getMessages(copilot.settings.language);
  const o = getOperationalMessages(copilot.settings.language);
  const isOverlay = copilot.settings.overlayEnabled;

  useEffect(() => {
    document.documentElement.dataset.theme = copilot.settings.theme;
    document.documentElement.lang = copilot.settings.language;
  }, [copilot.settings.language, copilot.settings.theme]);

  const overlayStyle = {
    "--overlay-opacity": copilot.settings.overlayOpacity.toFixed(2),
    "--overlay-text": copilot.settings.overlayTextTheme === "light" ? "#f4f7fb" : "#10151d",
    "--overlay-surface-rgb":
      copilot.settings.overlayTextTheme === "light" ? "10, 14, 20" : "245, 247, 250",
    "--overlay-shadow": copilot.settings.overlayTextShadow
      ? copilot.settings.overlayTextTheme === "light"
        ? "0 1px 5px rgba(0, 0, 0, 0.75)"
        : "0 1px 4px rgba(255, 255, 255, 0.7)"
      : "none"
  } as CSSProperties;

  if (isOverlay) {
    return (
      <div style={overlayStyle}>
        <OverlayShell copilot={copilot} />
      </div>
    );
  }

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: "meeting", label: o.nav.meeting },
    { id: "history", label: o.nav.history },
    { id: "context", label: o.nav.context },
    { id: "audio", label: o.nav.audio },
    { id: "settings", label: o.nav.settings },
    { id: "diagnostics", label: o.nav.diagnostics }
  ];

  return (
    <main className="application-shell">
      <header className="app-header">
        <div>
          <span className="product-mark" aria-hidden="true" />
          <strong>Meeting Copilot</strong>
        </div>
        <OverlayStatus
          state={copilot.visualState}
          labels={o.visualStates}
          captureActive={copilot.state === "listening"}
        />
      </header>

      <nav className="app-navigation" aria-label="Application sections">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? "active" : ""}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="app-content">
        {view === "meeting" && (
          <MeetingView copilot={copilot} t={t} o={o} onOpenAudio={() => setView("audio")} />
        )}
        {view === "history" && (
          <section className="page-section">
            <PageHeading title={o.recentHistory} subtitle={o.localOnly} />
            {copilot.history.length === 0 ? (
              <EmptyState text={o.noHistory} />
            ) : (
              <div className="session-list">
                {copilot.history.map((item) => (
                  <article key={item.turnId}>
                    <time>{new Date(item.createdAt).toLocaleTimeString()}</time>
                    <p>{item.question}</p>
                    <strong>{item.answer.sayThis}</strong>
                    <small>
                      {item.model} · {item.intelligenceLevel}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {view === "context" && (
          <section className="page-section">
            <PageHeading title={o.nav.context} subtitle={o.pendingBackend} />
            <div className="diagnostic-grid">
              <DiagnosticItem
                label="Context profile"
                value={copilot.settings.selectedContextProfileId ?? "None selected"}
              />
              <DiagnosticItem label="Glossary" value="Managed by the existing API" />
              <DiagnosticItem label="Secrets" value="Never displayed in the renderer" good />
            </div>
          </section>
        )}
        {view === "audio" && (
          <section className="page-section">
            <PageHeading title={o.nav.audio} subtitle={t.audioNotSaved} />
            <div className="settings-list">
              <div className="settings-row">
                <div>
                  <strong>{t.meetingAudioSource}</strong>
                  <small>Windows loopback uses the selected screen or window.</small>
                </div>
                <SourcePicker label="" />
              </div>
              <SettingsToggle
                label={t.includeMicrophone}
                description={
                  copilot.settings.includeMicrophone ? o.captureActive : o.captureInactive
                }
                checked={copilot.settings.includeMicrophone}
                onChange={(checked) => void copilot.updateSettings({ includeMicrophone: checked })}
              />
            </div>
            {copilot.error && (
              <ErrorState error={copilot.error} onRetry={() => void copilot.startTurn()} />
            )}
          </section>
        )}
        {view === "settings" && <SettingsView copilot={copilot} t={t} o={o} />}
        {view === "diagnostics" && (
          <DiagnosticsView copilot={copilot} o={o} onOpenAudio={() => setView("audio")} />
        )}
      </div>
    </main>
  );
}

function MeetingView({
  copilot,
  t,
  o,
  onOpenAudio
}: {
  copilot: Copilot;
  t: BaseMessages;
  o: OperationalMessages;
  onOpenAudio: () => void;
}) {
  return (
    <section className="meeting-layout">
      <div className="meeting-primary">
        <div className="meeting-toolbar">
          <div>
            <span>{t.holdToListen}</span>
            <kbd>{copilot.settings.hotkey}</kbd>
          </div>
          <button type="button" className="secondary-button" onClick={copilot.togglePause}>
            {copilot.paused ? o.resume : o.pause}
          </button>
          <button type="button" onClick={() => void window.copilot.window.setMode("compact")}>
            {t.overlayMode}
          </button>
        </div>

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

        {copilot.question && copilot.state !== "ready_to_send" && (
          <section className="question-preview">
            <div>
              <span>{o.detectedQuestion}</span>
              {copilot.questionWasNormalized && <small>{o.normalizedQuestion}</small>}
            </div>
            <p>{copilot.question}</p>
          </section>
        )}

        {copilot.answer ? (
          <QuickAnswer
            answer={copilot.answer}
            copied={copilot.copied}
            pinned={copilot.isPinned}
            expanded
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
          !copilot.error && <EmptyState text={o.noAnswer} />
        )}
      </div>

      <aside className="meeting-sidebar">
        <h2>{o.pinnedAnswers}</h2>
        {copilot.pinnedAnswers.length === 0 ? (
          <p className="muted">{o.noHistory}</p>
        ) : (
          copilot.pinnedAnswers.map((item) => (
            <article key={item.turnId} className="pinned-card">
              <p>{item.answer.sayThis}</p>
              <button
                type="button"
                className="text-button"
                onClick={() => copilot.unpin(item.turnId)}
              >
                {o.unpin}
              </button>
            </article>
          ))
        )}
        <button type="button" className="text-button" onClick={onOpenAudio}>
          {o.nav.audio} →
        </button>
      </aside>
    </section>
  );
}

function SettingsView({
  copilot,
  t,
  o
}: {
  copilot: Copilot;
  t: BaseMessages;
  o: OperationalMessages;
}) {
  return (
    <section className="page-section">
      <PageHeading title={o.nav.settings} subtitle="Meeting behavior and overlay preferences." />
      <div className="settings-list">
        <SettingsSelect
          label={o.theme}
          value={copilot.settings.theme}
          options={[
            ["system", o.themeSystem],
            ["dark", o.themeDark],
            ["light", o.themeLight]
          ]}
          onChange={(theme) =>
            void copilot.updateSettings({ theme: theme as AppSettings["theme"] })
          }
        />
        <SettingsSelect
          label={t.language}
          value={copilot.settings.language}
          options={languages.map((language) => [language.value, language.label])}
          onChange={(language) => void copilot.updateSettings({ language })}
        />
        <SettingsSelect
          label={t.hotkey}
          value={copilot.settings.hotkey}
          options={[
            ["Space", "Space"],
            ["F8", "F8"],
            ["F9", "F9"],
            ["F10", "F10"]
          ]}
          onChange={(hotkey) => void copilot.updateSettings({ hotkey })}
        />
        <SettingsSelect
          label={t.accuracy}
          value={copilot.settings.transcriptionDelay}
          options={[
            ["minimal", t.fastest],
            ["low", t.fast],
            ["medium", t.balanced],
            ["high", t.accurate],
            ["xhigh", t.mostAccurate]
          ]}
          onChange={(transcriptionDelay) =>
            void copilot.updateSettings({
              transcriptionDelay: transcriptionDelay as AppSettings["transcriptionDelay"]
            })
          }
        />
        <SettingsSelect
          label={t.submissionMode}
          value={copilot.settings.submissionMode}
          options={[
            ["push_to_talk", t.modePushToTalk],
            ["auto_detect", t.modeAutoDetect],
            ["review_before_send", t.modeReview]
          ]}
          onChange={(submissionMode) =>
            void copilot.updateSettings({
              submissionMode: submissionMode as AppSettings["submissionMode"],
              autoSubmit: submissionMode !== "review_before_send"
            })
          }
        />
        <SettingsSelect
          label={t.intelligence}
          value={copilot.settings.intelligenceLevel}
          options={[
            ["basic", t.intelligenceBasic],
            ["balanced", t.intelligenceBalanced],
            ["advanced", t.intelligenceAdvanced]
          ]}
          onChange={(intelligenceLevel) =>
            void copilot.updateSettings({
              intelligenceLevel: intelligenceLevel as AppSettings["intelligenceLevel"]
            })
          }
        />
        <SettingsSelect
          label={o.overlaySize}
          value={copilot.settings.overlayMode}
          options={[
            ["minimized", "Minimized"],
            ["compact", "Compact"],
            ["expanded", "Expanded"]
          ]}
          onChange={(overlayMode) =>
            void copilot.updateSettings({
              overlayMode: overlayMode as AppSettings["overlayMode"]
            })
          }
        />
        <div className="settings-row">
          <div>
            <strong>{t.overlayOpacity}</strong>
            <small>{Math.round(copilot.settings.overlayOpacity * 100)}%</small>
          </div>
          <input
            type="range"
            min="0.18"
            max="0.92"
            step="0.02"
            value={copilot.settings.overlayOpacity}
            onChange={(event) =>
              void copilot.updateSettings({ overlayOpacity: Number(event.target.value) })
            }
          />
        </div>
        <SettingsToggle
          label={t.overlayTextShadow}
          checked={copilot.settings.overlayTextShadow}
          onChange={(overlayTextShadow) => void copilot.updateSettings({ overlayTextShadow })}
        />
        <SettingsToggle
          label={o.alwaysOnTop}
          checked={copilot.settings.overlayAlwaysOnTop}
          onChange={(overlayAlwaysOnTop) => void copilot.updateSettings({ overlayAlwaysOnTop })}
        />
        <SettingsToggle
          label={o.clickThrough}
          description="Ctrl+Shift+O always recovers the overlay."
          checked={copilot.settings.overlayClickThrough}
          onChange={(overlayClickThrough) => void copilot.updateSettings({ overlayClickThrough })}
        />
        <SettingsToggle
          label={o.partialTranscript}
          checked={copilot.settings.showPartialTranscript}
          onChange={(showPartialTranscript) =>
            void copilot.updateSettings({ showPartialTranscript })
          }
        />
        <div className="settings-row">
          <div>
            <strong>Retention</strong>
            <small>
              Audio 0 days · transcript {copilot.settings.transcriptRetentionDays} days when backend
              persistence is enabled
            </small>
          </div>
          <span className="status-note">Runtime pending</span>
        </div>
      </div>
      <section className="shortcut-list">
        <h2>Keyboard shortcuts</h2>
        <ShortcutRow label="Push-to-talk" keys={copilot.settings.hotkey} />
        <ShortcutRow label="Show / recover overlay" keys="Ctrl Shift O" />
        <ShortcutRow label="Compact / expanded" keys="Ctrl Shift E" />
        <ShortcutRow label="Pause / resume" keys="Ctrl Shift P" />
        <ShortcutRow label={o.copy} keys="Ctrl Shift C" />
        <ShortcutRow label={o.pin} keys="Ctrl Shift K" />
      </section>
    </section>
  );
}

function DiagnosticsView({
  copilot,
  o,
  onOpenAudio
}: {
  copilot: Copilot;
  o: OperationalMessages;
  onOpenAudio: () => void;
}) {
  const copyReport = async () => {
    const report = {
      version: "0.1.0",
      captureState: copilot.state,
      visualState: copilot.visualState,
      language: copilot.settings.language,
      submissionMode: copilot.settings.submissionMode,
      intelligenceLevel: copilot.settings.intelligenceLevel,
      microphoneIncluded: copilot.settings.includeMicrophone,
      audioSaved: !copilot.settings.doNotSaveAudio,
      lastMetrics: copilot.lastMetrics,
      errorKind: copilot.error?.kind ?? null
    };
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  };

  return (
    <section className="page-section">
      <PageHeading title={o.nav.diagnostics} subtitle={o.safeDiagnostics} />
      <div className="diagnostic-grid">
        <DiagnosticItem label="Capture" value={copilot.visualState} />
        <DiagnosticItem
          label={o.apiStatus}
          value={copilot.error?.kind === "offline" ? "Offline" : "Not actively probed"}
          good={!copilot.error}
        />
        <DiagnosticItem label="Audio persistence" value="Disabled" good />
        <DiagnosticItem label="Transcript persistence" value="Runtime wiring pending" />
        <DiagnosticItem label="Renderer provider key" value="Not available" good />
        <DiagnosticItem
          label="Last total latency"
          value={
            copilot.lastMetrics?.totalMs === null || !copilot.lastMetrics
              ? "No sample"
              : `${copilot.lastMetrics.totalMs} ms`
          }
        />
      </div>
      <div className="page-actions">
        <button type="button" className="secondary-button" onClick={onOpenAudio}>
          {o.nav.audio}
        </button>
        <button type="button" onClick={() => void copyReport()}>
          Copy safe report
        </button>
      </div>
    </section>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">○</span>
      <p>{text}</p>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-row">
      <strong>{label}</strong>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiagnosticItem({
  label,
  value,
  good = false
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="diagnostic-item">
      <span>{label}</span>
      <strong className={good ? "good" : ""}>{value}</strong>
    </div>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="shortcut-row">
      <span>{label}</span>
      <kbd>{keys}</kbd>
    </div>
  );
}
