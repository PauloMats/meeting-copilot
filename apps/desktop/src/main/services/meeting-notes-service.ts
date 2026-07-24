import type {
  DailySummary,
  LoadedMeetingNote,
  MeetingContext,
  MeetingNoteData,
  MeetingResult,
  MeetingSummary,
  MeetingType,
  SaveMeetingNoteRequest,
  SavedMeetingNoteEntry,
  SavedMeetingNote
} from "@meeting-copilot/contracts";
import {
  DailySummarySchema,
  MeetingContextSchema,
  MeetingNoteDataSchema,
  MeetingSummarySchema,
  MeetingTypeSchema
} from "@meeting-copilot/contracts";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const NoteMetadataSchema = MeetingContextSchema.extend({
  meetingType: MeetingTypeSchema.default("general_meeting")
});

type NoteMetadata = MeetingContext & { meetingType: MeetingType };

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
    const dataFilePath = dataFilePathFor(filePath);
    const temporaryMarkdownPath = `${filePath}.tmp`;
    const temporaryDataPath = `${dataFilePath}.tmp`;
    await Promise.all([
      writeFile(temporaryMarkdownPath, renderMeetingNote(request), "utf8"),
      writeFile(temporaryDataPath, renderStructuredData(request), "utf8")
    ]);
    await rename(temporaryMarkdownPath, filePath);
    await rename(temporaryDataPath, dataFilePath);
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
    const [content, fileStats, structuredData] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
      readStructuredData(filePath)
    ]);
    return parseMeetingNote(filePath, content, fileStats.mtime.toISOString(), structuredData);
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
  const defaultTitle =
    request.meetingType === "daily"
      ? request.meetingName || (portuguese ? "Relatório da Daily" : "Daily status report")
      : portuguese
        ? "Ata da reunião"
        : "Meeting notes";
  const sections = [
    `# ${summary?.title.trim() || defaultTitle}`,
    "",
    renderMetadata(request),
    "",
    `- ${portuguese ? "Início" : "Started"}: ${request.startedAt}`,
    `- ${portuguese ? "Fim" : "Ended"}: ${request.endedAt}`,
    `- ${portuguese ? "Idioma" : "Language"}: ${request.language}`,
    `- ${portuguese ? "Tipo" : "Type"}: ${
      request.meetingType === "daily"
        ? "Daily / Status"
        : portuguese
          ? "Reunião geral"
          : "General meeting"
    }`,
    ...(request.meetingName
      ? [`- ${portuguese ? "Reunião" : "Meeting"}: ${request.meetingName}`]
      : []),
    ...(request.meetingDate
      ? [`- ${portuguese ? "Data da reunião" : "Meeting date"}: ${request.meetingDate}`]
      : []),
    "",
    summary
      ? renderResult(summary, request.meetingType, portuguese)
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

function renderMetadata(request: SaveMeetingNoteRequest): string {
  return `<!-- meeting-copilot-metadata: ${JSON.stringify({
    version: 2,
    meetingType: request.meetingType,
    meetingName: request.meetingName,
    meetingDate: request.meetingDate,
    orderedParticipants: request.orderedParticipants,
    speakerHints: request.speakerHints
  })} -->`;
}

function renderStructuredData(request: SaveMeetingNoteRequest): string {
  const data = MeetingNoteDataSchema.parse({
    schema_version: 1,
    meeting: {
      type: request.meetingType,
      name: request.meetingName,
      date: request.meetingDate,
      language: request.language,
      started_at: request.startedAt,
      ended_at: request.endedAt,
      ordered_participants: request.orderedParticipants,
      speaker_hints: request.speakerHints
    },
    ai_result: request.summary
  });
  return `${JSON.stringify(data, null, 2)}\n`;
}

function toSavedMeetingNoteEntry(note: LoadedMeetingNote): SavedMeetingNoteEntry {
  return {
    filePath: note.filePath,
    title: note.title,
    transcriptPreview: note.transcriptPreview,
    meetingType: note.meetingType,
    meetingName: note.meetingName,
    language: note.language,
    startedAt: note.startedAt,
    endedAt: note.endedAt,
    modifiedAt: note.modifiedAt,
    hasSummary: note.hasSummary,
    hasStructuredResult: note.hasStructuredResult
  };
}

function parseMeetingNote(
  filePath: string,
  content: string,
  modifiedAt: string,
  structuredData: MeetingNoteData | null
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
  const metadata = parseMetadata(content);
  const structuredMeeting = structuredData?.meeting;
  return {
    filePath,
    title,
    transcript,
    transcriptPreview: transcript.replace(/\s+/g, " ").slice(0, 180),
    meetingType: structuredMeeting?.type ?? metadata.meetingType,
    meetingName: structuredMeeting?.name ?? metadata.meetingName,
    meetingDate: structuredMeeting?.date ?? metadata.meetingDate,
    orderedParticipants: structuredMeeting?.ordered_participants ?? metadata.orderedParticipants,
    speakerHints: structuredMeeting?.speaker_hints ?? metadata.speakerHints,
    language: structuredMeeting?.language ?? language,
    startedAt: structuredMeeting?.started_at ?? startedAt,
    endedAt: structuredMeeting?.ended_at ?? endedAt,
    modifiedAt,
    hasSummary: /^## (?:Visão geral|Overview)\s*$/m.test(content),
    hasStructuredResult: structuredData ? structuredData.ai_result !== null : false,
    structuredResult: structuredData?.ai_result ?? null,
    dataFilePath: structuredData ? dataFilePathFor(filePath) : null
  };
}

async function readStructuredData(filePath: string): Promise<MeetingNoteData | null> {
  try {
    return MeetingNoteDataSchema.parse(
      JSON.parse(await readFile(dataFilePathFor(filePath), "utf8"))
    );
  } catch {
    return null;
  }
}

function dataFilePathFor(filePath: string): string {
  return filePath.replace(/\.md$/i, ".json");
}

function parseMetadata(content: string): NoteMetadata {
  const raw = /^<!-- meeting-copilot-metadata:\s*(\{.+\})\s*-->$/m.exec(content)?.[1];
  if (!raw) return NoteMetadataSchema.parse({});
  try {
    return NoteMetadataSchema.parse(JSON.parse(raw));
  } catch {
    return NoteMetadataSchema.parse({});
  }
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

function renderResult(
  result: MeetingResult,
  meetingType: SaveMeetingNoteRequest["meetingType"],
  portuguese: boolean
): string {
  return meetingType === "daily"
    ? renderDailySummary(DailySummarySchema.parse(result), portuguese)
    : renderSummary(MeetingSummarySchema.parse(result), portuguese);
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

function renderDailySummary(summary: DailySummary, portuguese: boolean): string {
  const sections: string[] = [
    portuguese ? "## Visão geral" : "## Overview",
    "",
    summary.overview.trim()
  ];

  if (summary.participant_updates.length) {
    sections.push(
      "",
      portuguese ? "## Atualizações por participante" : "## Participant updates",
      ""
    );
    for (const update of summary.participant_updates) {
      sections.push(
        `### ${update.participant || (portuguese ? "Participante não identificado" : "Unidentified participant")}`,
        "",
        `_${portuguese ? "Confiança da atribuição" : "Attribution confidence"}: ${confidenceLabel(update.attribution_confidence, portuguese)}_`,
        "",
        update.summary.trim()
      );
      appendList(sections, portuguese ? "Concluído" : "Completed", update.completed, 4);
      appendList(sections, portuguese ? "Em andamento" : "In progress", update.in_progress, 4);
      appendList(sections, portuguese ? "Bloqueios" : "Blockers", update.blockers, 4);
      appendDependencies(sections, update.dependencies, portuguese);
      appendList(sections, portuguese ? "Próximos passos" : "Next steps", update.next_steps, 4);
      sections.push("");
    }
    sections.pop();
  }

  appendList(sections, portuguese ? "Bloqueios do time" : "Team blockers", summary.team_blockers);
  appendList(
    sections,
    portuguese ? "Próximos passos do time" : "Team next steps",
    summary.team_next_steps
  );
  appendList(
    sections,
    portuguese ? "Participantes ausentes" : "Absent participants",
    summary.absent_participants
  );

  if (summary.unresolved_attributions.length) {
    sections.push(
      "",
      portuguese ? "## Atribuições não resolvidas" : "## Unresolved attributions",
      ""
    );
    for (const item of summary.unresolved_attributions) {
      const possible = item.possible_participants.length
        ? ` (${portuguese ? "possíveis" : "possible"}: ${item.possible_participants.join(", ")})`
        : "";
      sections.push(`- ${item.summary}${possible}`);
    }
  }

  return sections.join("\n");
}

function appendDependencies(
  sections: string[],
  dependencies: DailySummary["participant_updates"][number]["dependencies"],
  portuguese: boolean
): void {
  if (!dependencies.length) return;
  sections.push("", `#### ${portuguese ? "Dependências" : "Dependencies"}`, "");
  for (const item of dependencies) {
    sections.push(
      `- **${portuguese ? "Aguardando" : "Waiting for"}: ${item.person_or_team || (portuguese ? "não informado" : "not specified")}** — ${item.dependency}`
    );
  }
}

function confidenceLabel(
  confidence: DailySummary["participant_updates"][number]["attribution_confidence"],
  portuguese: boolean
): string {
  if (!portuguese) return confidence;
  return { high: "alta", medium: "média", low: "baixa" }[confidence];
}

function appendList(sections: string[], title: string, items: string[], headingLevel = 2): void {
  if (!items.length) return;
  sections.push(
    "",
    `${"#".repeat(headingLevel)} ${title}`,
    "",
    ...items.map((item) => `- ${item}`)
  );
}
