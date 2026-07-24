import { z } from "zod";

export const captureStates = [
  "idle",
  "listening",
  "transcribing",
  "ready_to_send",
  "thinking",
  "answering",
  "error"
] as const;

export const CaptureStateSchema = z.enum(captureStates);
export type CaptureState = z.infer<typeof CaptureStateSchema>;

export const TranscriptionDelaySchema = z.enum(["minimal", "low", "medium", "high", "xhigh"]);
export type TranscriptionDelay = z.infer<typeof TranscriptionDelaySchema>;

export const OverlayTextThemeSchema = z.enum(["light", "dark"]);
export type OverlayTextTheme = z.infer<typeof OverlayTextThemeSchema>;

export const IntelligenceLevelSchema = z.enum(["basic", "balanced", "advanced"]);
export type IntelligenceLevel = z.infer<typeof IntelligenceLevelSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const MeetingTypeSchema = z.enum(["general_meeting", "daily"]);
export type MeetingType = z.infer<typeof MeetingTypeSchema>;

export const SpeakerHintSchema = z
  .object({
    participant: z.string().trim().min(1).max(120),
    evidence: z.string().trim().max(1_000).optional(),
    known_update: z.string().trim().max(1_000).optional()
  })
  .refine((hint) => Boolean(hint.evidence || hint.known_update), {
    message: "A speaker hint requires evidence or a known update"
  });
export type SpeakerHint = z.infer<typeof SpeakerHintSchema>;

export const MeetingContextSchema = z.object({
  meetingName: z.string().trim().max(160).default(""),
  meetingDate: z.string().trim().max(32).default(""),
  orderedParticipants: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  speakerHints: z.array(SpeakerHintSchema).max(30).default([])
});
export type MeetingContext = z.infer<typeof MeetingContextSchema>;

export const AnswerSchema = z.object({
  direct_answer: z.string(),
  detailed_explanation: z.string(),
  example: z.string(),
  assumptions: z.array(z.string()),
  follow_up_questions: z.array(z.string()),
  confidence: ConfidenceSchema
});
export type Answer = z.infer<typeof AnswerSchema>;

export const MeetingSummarySchema = z.object({
  title: z.string(),
  overview: z.string(),
  key_topics: z.array(
    z.object({
      topic: z.string(),
      summary: z.string()
    })
  ),
  decisions: z.array(
    z.object({
      decision: z.string(),
      context: z.string()
    })
  ),
  action_items: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      due_date: z.string(),
      priority: z.enum(["high", "medium", "low"])
    })
  ),
  next_steps: z.array(z.string()),
  open_questions: z.array(z.string())
});
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;

export const DailySummarySchema = z.object({
  title: z.string(),
  overview: z.string(),
  participant_updates: z
    .array(
      z.object({
        participant: z.string(),
        attribution_confidence: ConfidenceSchema,
        summary: z.string(),
        completed: z.array(z.string()).max(6),
        in_progress: z.array(z.string()).max(6),
        blockers: z.array(z.string()).max(6),
        dependencies: z
          .array(
            z.object({
              person_or_team: z.string(),
              dependency: z.string()
            })
          )
          .max(6),
        next_steps: z.array(z.string()).max(6)
      })
    )
    .max(30),
  team_blockers: z.array(z.string()).max(10),
  team_next_steps: z.array(z.string()).max(10),
  absent_participants: z.array(z.string()).max(20),
  unresolved_attributions: z
    .array(
      z.object({
        summary: z.string(),
        possible_participants: z.array(z.string()).max(30)
      })
    )
    .max(10)
});
export type DailySummary = z.infer<typeof DailySummarySchema>;

export const MeetingResultSchema = z.union([MeetingSummarySchema, DailySummarySchema]);
export type MeetingResult = z.infer<typeof MeetingResultSchema>;

export const MeetingNoteDataSchema = z.object({
  schema_version: z.literal(1),
  meeting: z.object({
    type: MeetingTypeSchema,
    name: z.string(),
    date: z.string(),
    language: z.string(),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime(),
    ordered_participants: z.array(z.string()),
    speaker_hints: z.array(SpeakerHintSchema)
  }),
  ai_result: MeetingResultSchema.nullable()
});
export type MeetingNoteData = z.infer<typeof MeetingNoteDataSchema>;

export const SavedMeetingNoteSchema = z.object({
  filePath: z.string().min(1)
});
export type SavedMeetingNote = z.infer<typeof SavedMeetingNoteSchema>;

export const MeetingExportResultSchema = z.object({
  status: z.enum(["saved", "copied", "cancelled"]),
  filePath: z.string().nullable()
});
export type MeetingExportResult = z.infer<typeof MeetingExportResultSchema>;

export interface SavedMeetingNoteEntry {
  filePath: string;
  title: string;
  transcriptPreview: string;
  meetingType: MeetingType;
  meetingName: string;
  language: string;
  startedAt: string;
  endedAt: string;
  modifiedAt: string;
  hasSummary: boolean;
  hasStructuredResult: boolean;
}

export interface LoadedMeetingNote extends SavedMeetingNoteEntry {
  transcript: string;
  structuredResult: MeetingResult | null;
  dataFilePath: string | null;
  meetingDate: string;
  orderedParticipants: string[];
  speakerHints: SpeakerHint[];
}

export const ContextProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  projectDescription: z.string().max(10_000).default(""),
  techStack: z.array(z.string().min(1).max(100)).default([]),
  businessContext: z.string().max(10_000).default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ContextProfile = z.infer<typeof ContextProfileSchema>;

export const GlossaryTermSchema = z.object({
  id: z.string().uuid(),
  source: z.string().min(1).max(200),
  replacement: z.string().min(1).max(500),
  kind: z.enum(["acronym", "project", "vendor", "codeword", "synonym"]),
  caseSensitive: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

export const AppSettingsSchema = z.object({
  hotkey: z.string().default("Space"),
  includeMicrophone: z.boolean().default(false),
  autoSubmit: z.boolean().default(true),
  doNotSaveAudio: z.boolean().default(true),
  transcriptRetentionDays: z.number().int().min(0).max(3650).default(30),
  audioRetentionDays: z.number().int().min(0).max(365).default(0),
  transcriptionDelay: TranscriptionDelaySchema.default("minimal"),
  intelligenceLevel: IntelligenceLevelSchema.default("basic"),
  language: z.string().min(2).max(10).default("en"),
  overlayEnabled: z.boolean().default(false),
  overlayOpacity: z.number().min(0.08).max(0.92).default(0.58),
  overlayTextTheme: OverlayTextThemeSchema.default("light"),
  overlayTextShadow: z.boolean().default(true),
  selectedContextProfileId: z.string().uuid().nullable().default(null)
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({});

export interface TranscriptTurn {
  turnId: string;
  itemId: string | null;
  raw: string;
  normalized: string | null;
  status: "streaming" | "final" | "cancelled" | "failed";
  startedAt: string;
  finalizedAt: string | null;
}

export interface MeetingMemoryItem {
  transcript: string;
  directAnswer: string;
}
