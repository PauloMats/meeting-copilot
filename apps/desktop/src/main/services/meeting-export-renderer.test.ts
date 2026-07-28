import type { DailySummary, LoadedMeetingNote, MeetingSummary } from "@meeting-copilot/contracts";
import { describe, expect, it } from "vitest";
import { renderMeetingExport } from "./meeting-export-renderer.js";

const baseNote: Omit<LoadedMeetingNote, "meetingType" | "structuredResult"> = {
  filePath: "/tmp/Meeting Copilot/meeting.md",
  dataFilePath: "/tmp/Meeting Copilot/meeting.json",
  title: "Ata",
  transcript: "Transcrição completa.",
  transcriptPreview: "Transcrição completa.",
  meetingName: "Planejamento",
  meetingDate: "2026-07-24",
  language: "pt",
  startedAt: "2026-07-24T12:00:00.000Z",
  endedAt: "2026-07-24T12:30:00.000Z",
  modifiedAt: "2026-07-24T12:31:00.000Z",
  hasSummary: true,
  hasStructuredResult: true,
  orderedParticipants: [],
  speakerHints: [],
  speakerSegments: []
};

describe("renderMeetingExport", () => {
  it("renders a standalone general-meeting report and escapes user content", () => {
    const summary: MeetingSummary = {
      title: "Planejamento <script>alert('x')</script>",
      overview: "O time organizou a entrega.",
      key_topics: [{ topic: "Release", summary: "Publicação gradual." }],
      decisions: [{ decision: "Usar rollout gradual", context: "Reduzir risco." }],
      action_items: [
        {
          task: "Preparar release notes",
          owner: "Ana",
          due_date: "Sexta-feira",
          priority: "high"
        }
      ],
      next_steps: ["Revisar o plano"],
      open_questions: ["Quem acompanha a publicação?"]
    };

    const rendered = renderMeetingExport({
      ...baseNote,
      meetingType: "general_meeting",
      structuredResult: summary
    });

    expect(rendered.documentHtml).toContain("<!doctype html>");
    expect(rendered.documentHtml).toContain("Tarefas e responsáveis");
    expect(rendered.documentHtml).toContain("Preparar release notes");
    expect(rendered.documentHtml).toContain("&lt;script&gt;");
    expect(rendered.documentHtml).not.toContain("<script>alert");
    expect(rendered.plainText).toContain("Ana");
    expect(rendered.fragmentHtml).toContain("Meeting Copilot");
  });

  it("renders participant updates and dependencies for a daily", () => {
    const summary: DailySummary = {
      title: "Daily Dourado — 24/07/2026",
      participant_updates: [
        {
          participant: "Igor",
          attribution_confidence: "high",
          updates: [
            "Está finalizando o dashboard.",
            "Corrigiu o filtro.",
            "O problema já foi repassado ao Victor."
          ],
          blockers: ["A rota padrão de procura está com erro."],
          next_steps: ["Abrir o PR."]
        }
      ],
      unresolved_attributions: []
    };

    const rendered = renderMeetingExport({
      ...baseNote,
      meetingType: "daily",
      structuredResult: summary
    });

    expect(rendered.documentHtml).toContain("Igor");
    expect(rendered.documentHtml).toContain("O problema já foi repassado ao Victor.");
    expect(rendered.documentHtml).toContain("<b>Bloqueio:</b>");
    expect(rendered.documentHtml).toContain("<b>Próximo passo:</b>");
    expect(rendered.documentHtml).not.toContain("STATUS GERAL DO TIME");
    expect(rendered.plainText).toContain("Bloqueio: A rota padrão de procura está com erro.");
    expect(rendered.plainText).toContain("Próximo passo: Abrir o PR.");
  });

  it("refuses to export legacy notes without a structured result", () => {
    expect(() =>
      renderMeetingExport({
        ...baseNote,
        meetingType: "general_meeting",
        hasStructuredResult: false,
        dataFilePath: null,
        structuredResult: null
      })
    ).toThrow("structured AI data");
  });
});
