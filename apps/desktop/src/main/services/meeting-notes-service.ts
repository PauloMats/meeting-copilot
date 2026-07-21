import type {
  MeetingSummary,
  SaveMeetingNoteRequest,
  SavedMeetingNote
} from "@meeting-copilot/contracts";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export class MeetingNotesService {
  private readonly notesDirectory: string;

  constructor(documentsDirectory: string) {
    this.notesDirectory = join(documentsDirectory, "Meeting Copilot");
  }

  async save(request: SaveMeetingNoteRequest): Promise<SavedMeetingNote> {
    await mkdir(this.notesDirectory, { recursive: true });
    const filePath = join(this.notesDirectory, filenameFor(request.startedAt));
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, renderMeetingNote(request), "utf8");
    await rename(temporaryPath, filePath);
    return { filePath };
  }

  isManagedFile(filePath: string): boolean {
    const resolved = resolve(filePath);
    return dirname(resolved) === resolve(this.notesDirectory) && basename(resolved).endsWith(".md");
  }
}

function filenameFor(startedAt: string): string {
  const timestamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  return `meeting-${timestamp}.md`;
}

function renderMeetingNote(request: SaveMeetingNoteRequest): string {
  const { summary } = request;
  const portuguese = request.language === "pt";
  const sections = [
    `# ${summary?.title.trim() || (portuguese ? "Ata da reunião" : "Meeting notes")}`,
    "",
    `- ${portuguese ? "Início" : "Started"}: ${request.startedAt}`,
    `- ${portuguese ? "Fim" : "Ended"}: ${request.endedAt}`,
    "",
    summary
      ? renderSummary(summary, portuguese)
      : portuguese
        ? "_O resumo da IA ainda está sendo gerado._"
        : "_AI summary is still being generated._",
    "",
    portuguese ? "## Transcrição" : "## Transcript",
    "",
    request.transcript.trim(),
    ""
  ];
  return sections.join("\n");
}

function renderSummary(summary: MeetingSummary, portuguese: boolean): string {
  const sections: string[] = [
    portuguese ? "## Visão geral" : "## Overview",
    "",
    summary.overview.trim()
  ];

  if (summary.key_topics.length) {
    sections.push("", portuguese ? "## Principais tópicos" : "## Key topics", "");
    for (const item of summary.key_topics) {
      sections.push(`### ${item.topic}`, "", item.summary.trim(), "");
    }
    sections.pop();
  }

  if (summary.decisions.length) {
    sections.push("", portuguese ? "## Decisões" : "## Decisions", "");
    for (const item of summary.decisions) {
      sections.push(`- **${item.decision}**${item.context ? ` — ${item.context}` : ""}`);
    }
  }

  if (summary.action_items.length) {
    sections.push("", portuguese ? "## Tarefas" : "## Action items", "");
    for (const item of summary.action_items) {
      const metadata = [
        item.owner
          ? `${portuguese ? "Responsável" : "Owner"}: ${item.owner}`
          : portuguese
            ? "Responsável: não definido"
            : "Owner: not assigned",
        item.due_date
          ? `${portuguese ? "Prazo" : "Due"}: ${item.due_date}`
          : portuguese
            ? "Prazo: não definido"
            : "Due: not defined",
        `${portuguese ? "Prioridade" : "Priority"}: ${item.priority}`
      ].join("; ");
      sections.push(`- [ ] ${item.task} — ${metadata}`);
    }
  }

  appendList(sections, portuguese ? "Próximos passos" : "Next steps", summary.next_steps);
  appendList(
    sections,
    portuguese ? "Questões em aberto" : "Open questions",
    summary.open_questions
  );
  return sections.join("\n");
}

function appendList(sections: string[], title: string, items: string[]): void {
  if (!items.length) return;
  sections.push("", `## ${title}`, "", ...items.map((item) => `- ${item}`));
}
