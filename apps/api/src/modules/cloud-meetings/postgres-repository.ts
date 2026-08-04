import {
  CloudMeetingEntrySchema,
  CloudMeetingNoteSchema,
  type CloudMeetingEntry,
  type CloudMeetingNote,
  type UpsertCloudMeetingRequest
} from "@meeting-copilot/contracts";
import { cloudMeetingNotes, users, type Database } from "@meeting-copilot/database";
import { and, desc, eq } from "drizzle-orm";
import type { CloudMeetingRepository } from "./repository.js";
import { previewFor, titleFor } from "./repository.js";

export class PostgresCloudMeetingRepository implements CloudMeetingRepository {
  private userId: string | null = null;

  constructor(
    private readonly database: Database,
    private readonly userEmail: string
  ) {}

  async init(): Promise<void> {
    const [existing] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, this.userEmail))
      .limit(1);
    if (existing) {
      this.userId = existing.id;
      return;
    }
    const [created] = await this.database
      .insert(users)
      .values({ email: this.userEmail })
      .returning({ id: users.id });
    if (!created) throw new Error("Could not bootstrap the cloud meeting user");
    this.userId = created.id;
  }

  async list(): Promise<CloudMeetingEntry[]> {
    const rows = await this.database
      .select()
      .from(cloudMeetingNotes)
      .where(eq(cloudMeetingNotes.userId, this.requireUserId()))
      .orderBy(desc(cloudMeetingNotes.startedAt));
    return rows.map((row) => CloudMeetingEntrySchema.parse(toCloudMeeting(row)));
  }

  async find(id: string): Promise<CloudMeetingNote | null> {
    const [row] = await this.database
      .select()
      .from(cloudMeetingNotes)
      .where(and(eq(cloudMeetingNotes.id, id), eq(cloudMeetingNotes.userId, this.requireUserId())))
      .limit(1);
    return row ? CloudMeetingNoteSchema.parse(toCloudMeeting(row)) : null;
  }

  async upsert(request: UpsertCloudMeetingRequest): Promise<CloudMeetingNote> {
    const now = new Date();
    const [row] = await this.database
      .insert(cloudMeetingNotes)
      .values({
        userId: this.requireUserId(),
        clientMeetingId: request.clientMeetingId,
        ...valuesFor(request),
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [cloudMeetingNotes.userId, cloudMeetingNotes.clientMeetingId],
        set: { ...valuesFor(request), updatedAt: now }
      })
      .returning();
    if (!row) throw new Error("Could not save the cloud meeting");
    return CloudMeetingNoteSchema.parse(toCloudMeeting(row));
  }

  async deleteByClientMeetingId(clientMeetingId: string): Promise<boolean> {
    const deleted = await this.database
      .delete(cloudMeetingNotes)
      .where(
        and(
          eq(cloudMeetingNotes.clientMeetingId, clientMeetingId),
          eq(cloudMeetingNotes.userId, this.requireUserId())
        )
      )
      .returning({ id: cloudMeetingNotes.id });
    return deleted.length > 0;
  }

  private requireUserId(): string {
    if (!this.userId) throw new Error("Repository has not been initialized");
    return this.userId;
  }
}

function valuesFor(request: UpsertCloudMeetingRequest) {
  return {
    title: titleFor(request),
    meetingType: request.meetingType,
    meetingName: request.meetingName,
    meetingDate: request.meetingDate,
    language: request.language,
    transcript: request.transcript,
    summary: request.summary as Record<string, unknown> | null,
    orderedParticipants: request.orderedParticipants,
    speakerHints: request.speakerHints,
    speakerSegments: request.speakerSegments,
    startedAt: new Date(request.startedAt),
    endedAt: new Date(request.endedAt)
  };
}

function toCloudMeeting(row: typeof cloudMeetingNotes.$inferSelect) {
  return {
    id: row.id,
    clientMeetingId: row.clientMeetingId,
    title: row.title,
    transcriptPreview: previewFor(row.transcript),
    meetingType: row.meetingType,
    meetingName: row.meetingName,
    meetingDate: row.meetingDate,
    language: row.language,
    transcript: row.transcript,
    summary: row.summary,
    orderedParticipants: row.orderedParticipants,
    speakerHints: row.speakerHints,
    speakerSegments: row.speakerSegments,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hasSummary: row.summary !== null
  };
}
