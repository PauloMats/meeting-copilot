import { z } from "zod";
import {
  AnswerSchema,
  AppSettingsSchema,
  ContextProfileSchema,
  DailySummarySchema,
  GlossaryTermSchema,
  IntelligenceLevelSchema,
  MeetingContextSchema,
  MeetingNotePayloadSchema,
  MeetingResultSchema,
  MeetingSummarySchema,
  MeetingTypeSchema
} from "./domain.js";

export const RealtimeTokenRequestSchema = z.object({
  language: z.string().min(2).max(10),
  delay: z.enum(["minimal", "low", "medium", "high", "xhigh"])
});

export const RealtimeTokenResponseSchema = z.object({
  value: z.string().min(1),
  expiresAt: z.number().int(),
  websocketUrl: z.string().url()
});

export const AnswerRequestSchema = z.object({
  transcript: z.string().min(1).max(50_000),
  intelligenceLevel: IntelligenceLevelSchema.default("basic"),
  contextProfileId: z.string().uuid().nullable().default(null),
  meetingMemory: z
    .array(
      z.object({
        transcript: z.string(),
        directAnswer: z.string()
      })
    )
    .max(10)
    .default([])
});

export const AnswerResponseSchema = z.object({
  answer: AnswerSchema,
  model: z.string(),
  intelligenceLevel: IntelligenceLevelSchema,
  rawTranscript: z.string(),
  normalizedTranscript: z.string(),
  retrievedSnippets: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      source: z.string(),
      score: z.number().nullable()
    })
  )
});

export const MeetingSummaryRequestSchema = z
  .object({
    transcript: z.string().min(1).max(200_000),
    intelligenceLevel: IntelligenceLevelSchema.default("balanced"),
    language: z.string().min(2).max(10),
    meetingType: MeetingTypeSchema.default("general_meeting")
  })
  .merge(MeetingContextSchema);

export const MeetingSummaryResponseSchema = z.object({
  summary: z.union([MeetingSummarySchema, DailySummarySchema]),
  meetingType: MeetingTypeSchema,
  model: z.string(),
  intelligenceLevel: IntelligenceLevelSchema
});

export const UpsertCloudMeetingRequestSchema = MeetingNotePayloadSchema.extend({
  clientMeetingId: z.string().uuid()
});

export const CloudMeetingEntrySchema = z.object({
  id: z.string().uuid(),
  clientMeetingId: z.string().uuid(),
  title: z.string(),
  transcriptPreview: z.string(),
  meetingType: MeetingTypeSchema,
  meetingName: z.string(),
  language: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hasSummary: z.boolean()
});

export const CloudMeetingNoteSchema = CloudMeetingEntrySchema.extend({
  transcript: z.string(),
  summary: MeetingResultSchema.nullable(),
  meetingDate: z.string(),
  orderedParticipants: z.array(z.string()),
  speakerHints: MeetingContextSchema.shape.speakerHints,
  speakerSegments: MeetingContextSchema.shape.speakerSegments
});

export const CloudMeetingListResponseSchema = z.object({
  meetings: z.array(CloudMeetingEntrySchema)
});

export const DeleteCloudMeetingResponseSchema = z.object({ deleted: z.boolean() });

export const CreateContextProfileSchema = ContextProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const UpdateContextProfileSchema = CreateContextProfileSchema.partial();

export const CreateGlossaryTermSchema = GlossaryTermSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const UpdateGlossaryTermSchema = CreateGlossaryTermSchema.partial();

export const UpdateSettingsSchema = AppSettingsSchema.partial();

export type RealtimeTokenRequest = z.infer<typeof RealtimeTokenRequestSchema>;
export type RealtimeTokenResponse = z.infer<typeof RealtimeTokenResponseSchema>;
export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;
export type MeetingSummaryRequest = z.infer<typeof MeetingSummaryRequestSchema>;
export type MeetingSummaryResponse = z.infer<typeof MeetingSummaryResponseSchema>;
export type UpsertCloudMeetingRequest = z.infer<typeof UpsertCloudMeetingRequestSchema>;
export type CloudMeetingEntry = z.infer<typeof CloudMeetingEntrySchema>;
export type CloudMeetingNote = z.infer<typeof CloudMeetingNoteSchema>;
export type CloudMeetingListResponse = z.infer<typeof CloudMeetingListResponseSchema>;
export type DeleteCloudMeetingResponse = z.infer<typeof DeleteCloudMeetingResponseSchema>;
