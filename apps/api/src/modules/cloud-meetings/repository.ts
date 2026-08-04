import {
  CloudMeetingEntrySchema,
  CloudMeetingNoteSchema,
  type CloudMeetingEntry,
  type CloudMeetingNote,
  type UpsertCloudMeetingRequest
} from "@meeting-copilot/contracts";
import { randomUUID } from "node:crypto";

export interface CloudMeetingRepository {
  init(): Promise<void>;
  list(): Promise<CloudMeetingEntry[]>;
  find(id: string): Promise<CloudMeetingNote | null>;
  upsert(request: UpsertCloudMeetingRequest): Promise<CloudMeetingNote>;
  deleteByClientMeetingId(clientMeetingId: string): Promise<boolean>;
}

export class MemoryCloudMeetingRepository implements CloudMeetingRepository {
  private readonly notes = new Map<string, CloudMeetingNote>();

  async init(): Promise<void> {}

  list(): Promise<CloudMeetingEntry[]> {
    return Promise.resolve(
      [...this.notes.values()]
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
        .map((note) => CloudMeetingEntrySchema.parse(note))
    );
  }

  find(id: string): Promise<CloudMeetingNote | null> {
    return Promise.resolve(this.notes.get(id) ?? null);
  }

  upsert(request: UpsertCloudMeetingRequest): Promise<CloudMeetingNote> {
    const existing = [...this.notes.values()].find(
      (note) => note.clientMeetingId === request.clientMeetingId
    );
    const now = new Date().toISOString();
    const note = CloudMeetingNoteSchema.parse({
      id: existing?.id ?? randomUUID(),
      ...request,
      title: titleFor(request),
      transcriptPreview: previewFor(request.transcript),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      hasSummary: request.summary !== null
    });
    this.notes.set(note.id, note);
    return Promise.resolve(note);
  }

  deleteByClientMeetingId(clientMeetingId: string): Promise<boolean> {
    const match = [...this.notes.values()].find((note) => note.clientMeetingId === clientMeetingId);
    return Promise.resolve(match ? this.notes.delete(match.id) : false);
  }
}

export function titleFor(request: UpsertCloudMeetingRequest): string {
  if (request.summary?.title.trim()) return request.summary.title.trim();
  if (request.meetingName.trim()) return request.meetingName.trim();
  const portuguese = request.language.toLowerCase().startsWith("pt");
  return request.meetingType === "daily"
    ? portuguese
      ? "Relatório da Daily"
      : "Daily status report"
    : portuguese
      ? "Ata da reunião"
      : "Meeting notes";
}

export function previewFor(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim().slice(0, 180);
}
