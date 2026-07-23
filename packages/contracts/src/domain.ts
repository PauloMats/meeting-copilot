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

export const SavedMeetingNoteSchema = z.object({
  filePath: z.string().min(1)
});
export type SavedMeetingNote = z.infer<typeof SavedMeetingNoteSchema>;

export interface SavedMeetingNoteEntry {
  filePath: string;
  title: string;
  transcriptPreview: string;
  language: string;
  startedAt: string;
  endedAt: string;
  modifiedAt: string;
  hasSummary: boolean;
}

export interface LoadedMeetingNote extends SavedMeetingNoteEntry {
  transcript: string;
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
