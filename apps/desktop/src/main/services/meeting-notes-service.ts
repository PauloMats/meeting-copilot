import type {
  LoadedMeetingNote,
  MeetingSummary,
  SaveMeetingNoteRequest,
  SavedMeetingNoteEntry,
  SavedMeetingNote
} from "@meeting-copilot/contracts";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export class MeetingNotesService {
  private readonly notesDirectory: string;

  constructor(documentsDirectory: string) {
    this.notesDirectory = join(documentsDirectory, "Meeting Copilot");
  }

  async save(request: SaveMeetingNoteRequest): Promise<SavedMeetingNote> {
    await mkdir(this.notesDirectory, { recursive: true });
    const filePath = join(this.notesDirectory, filenameFor(request.startedAt));
    return this.write(filePath, request);
  }

  async update(filePath: string, request: SaveMeetingNoteRequest): Promise<SavedMeetingNote> {
    if (!this.isManagedFile(filePath)) throw new Error("Invalid meeting note path");
    return this.write(filePath, request);
  }

  private async write(
    filePath: string,
    request: SaveMeetingNoteRequest
  ): Promise<SavedMeetingNote> {
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, renderMeetingNote(request), "utf8");
    await rename(temporaryPath, filePath);
    return { filePath };
  }

  async list(): Promise<SavedMeetingNoteEntry[]> {
    let filenames: string[];
    try {
      const entries = await readdir(this.notesDirectory, { withFileTypes: true });
      filenames = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name);
    } catch (cause) {
      if (isMissingDirectoryError(cause)) return [];
      throw cause;
    }

    const notes = await Promise.all(
      filenames.map(async (filename) => {
        try {
          return await this.read(join(this.notesDirectory, filename));
        } catch {
          return null;
        }
      })
    );
    return notes
      .filter((note): note is LoadedMeetingNote => note !== null)
      .map(toSavedMeetingNoteEntry)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  async read(filePath: string): Promise<LoadedMeetingNote> {
    if (!this.isManagedFile(filePath)) throw new Error("Invalid meeting note path");
    const [content, fileStats] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
    return parseMeetingNote(filePath, content, fileStats.mtime.toISOString());
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
    `- ${portuguese ? "Idioma" : "Language"}: ${request.language}`,
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

function toSavedMeetingNoteEntry(note: LoadedMeetingNote): SavedMeetingNoteEntry {
  return {
    filePath: note.filePath,
    title: note.title,
    transcriptPreview: note.transcriptPreview,
    language: note.language,
    startedAt: note.startedAt,
    endedAt: note.endedAt,
    modifiedAt: note.modifiedAt,
    hasSummary: note.hasSummary
  };
}

function parseMeetingNote(
  filePath: string,
  content: string,
  modifiedAt: string
): LoadedMeetingNote {
  const title = matchRequired(content, /^#\s+(.+)$/m, "title");
  const startedAt = matchRequired(content, /^- (?:Início|Started):\s*(.+)$/m, "start time");
  const endedAt = matchRequired(content, /^- (?:Fim|Ended):\s*(.+)$/m, "end time");
  if (Number.isNaN(Date.parse(startedAt)) || Number.isNaN(Date.parse(endedAt))) {
    throw new Error("Meeting note date metadata is invalid");
  }
  const transcriptMarker = /^## (?:Transcrição|Transcript)\s*$/m.exec(content);
  if (transcriptMarker?.index === undefined) {
    throw new Error("Meeting note transcript section is missing");
  }
  const transcript = content.slice(transcriptMarker.index + transcriptMarker[0].length).trim();
  if (!transcript) throw new Error("Meeting note transcript is empty");

  const explicitLanguage = /^- (?:Idioma|Language):\s*(\S+)\s*$/m.exec(content)?.[1];
  const language = explicitLanguage ?? (/^## Transcrição\s*$/m.test(content) ? "pt" : "en");
  return {
    filePath,
    title,
    transcript,
    transcriptPreview: transcript.replace(/\s+/g, " ").slice(0, 180),
    language,
    startedAt,
    endedAt,
    modifiedAt,
    hasSummary: /^## (?:Visão geral|Overview)\s*$/m.test(content)
  };
}

function matchRequired(content: string, pattern: RegExp, field: string): string {
  const value = pattern.exec(content)?.[1]?.trim();
  if (!value) throw new Error(`Meeting note ${field} is missing`);
  return value;
}

function isMissingDirectoryError(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "ENOENT"
  );
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
