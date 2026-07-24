import type { MeetingExportResult } from "@meeting-copilot/contracts";
import { useEffect, useRef, useState } from "react";

type ExportKind = "pdf" | "html" | "copy";

export function MeetingExportMenu({
  filePath,
  structuredResultAvailable,
  disabled = false,
  portuguese,
  compact = false
}: {
  filePath: string | null;
  structuredResultAvailable: boolean;
  disabled?: boolean;
  portuguese: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const unavailable = disabled || !filePath || !structuredResultAvailable;

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const exportMeeting = async (kind: ExportKind) => {
    if (unavailable || !filePath || busy) return;
    setBusy(kind);
    setFeedback(null);
    try {
      const result =
        kind === "pdf"
          ? await window.copilot.meetingNotes.exportPdf(filePath)
          : kind === "html"
            ? await window.copilot.meetingNotes.exportHtml(filePath)
            : await window.copilot.meetingNotes.copyFormatted(filePath);
      showResult(kind, result, portuguese, setFeedback);
    } catch (cause) {
      setFeedback(
        cause instanceof Error
          ? cause.message
          : portuguese
            ? "Não foi possível exportar a ata."
            : "Could not export the meeting notes."
      );
    } finally {
      setBusy(null);
      if (details.current) details.current.open = false;
    }
  };

  const unavailableReason = !structuredResultAvailable
    ? portuguese
      ? "Gere novamente esta ata uma vez para criar o resultado estruturado da v0.5."
      : "Generate these notes once to create the v0.5 structured result."
    : portuguese
      ? "Aguarde a ata terminar de ser salva."
      : "Wait for the meeting notes to finish saving.";

  return (
    <div className={`meeting-export ${compact ? "is-compact" : ""}`}>
      <details ref={details} className="meeting-export-menu">
        <summary
          className="secondary compact-button meeting-export-trigger"
          aria-disabled={unavailable || Boolean(busy)}
          title={unavailable ? unavailableReason : undefined}
          onClick={(event) => {
            if (unavailable || busy) event.preventDefault();
          }}
        >
          <span aria-hidden="true">⇩</span>
          {portuguese ? "Exportar" : "Export"}
        </summary>
        <div className="meeting-export-popover">
          <button type="button" disabled={Boolean(busy)} onClick={() => void exportMeeting("pdf")}>
            <span className="meeting-export-icon" aria-hidden="true">
              PDF
            </span>
            <span>
              <strong>{portuguese ? "Salvar como PDF" : "Save as PDF"}</strong>
              <small>{portuguese ? "Pronto para compartilhar" : "Ready to share"}</small>
            </span>
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void exportMeeting("html")}>
            <span className="meeting-export-icon" aria-hidden="true">
              HTML
            </span>
            <span>
              <strong>{portuguese ? "Salvar como HTML" : "Save as HTML"}</strong>
              <small>{portuguese ? "Abre em qualquer navegador" : "Opens in any browser"}</small>
            </span>
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void exportMeeting("copy")}>
            <span className="meeting-export-icon copy-icon" aria-hidden="true" />
            <span>
              <strong>{portuguese ? "Copiar formatado" : "Copy formatted"}</strong>
              <small>{portuguese ? "Para e-mail, Docs ou Word" : "For email, Docs, or Word"}</small>
            </span>
          </button>
        </div>
      </details>
      {feedback && (
        <span className="meeting-export-feedback" role="status" title={feedback}>
          {feedback}
        </span>
      )}
    </div>
  );
}

function showResult(
  kind: ExportKind,
  result: MeetingExportResult,
  portuguese: boolean,
  setFeedback: (value: string | null) => void
) {
  if (result.status === "cancelled") return;
  if (result.status === "copied" || kind === "copy") {
    setFeedback(portuguese ? "✓ Ata copiada com formatação" : "✓ Formatted notes copied");
    return;
  }
  setFeedback(
    kind === "pdf"
      ? portuguese
        ? "✓ PDF salvo"
        : "✓ PDF saved"
      : portuguese
        ? "✓ HTML salvo"
        : "✓ HTML saved"
  );
}
