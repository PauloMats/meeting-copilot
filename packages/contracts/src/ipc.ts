import type {
  AnswerRequest,
  AnswerResponse,
  MeetingSummaryRequest,
  MeetingSummaryResponse,
  RealtimeTokenRequest,
  RealtimeTokenResponse
} from "./api.js";
import { z } from "zod";
import {
  MeetingSummarySchema,
  type AppSettings,
  type CaptureState,
  type SavedMeetingNote
} from "./domain.js";

export const IPC_CHANNELS = {
  captureStart: "capture:start",
  captureStop: "capture:stop",
  captureCancel: "capture:cancel",
  hotkeyPressed: "hotkey:pressed",
  hotkeyReleased: "hotkey:released",
  audioChunk: "audio:chunk",
  stateChanged: "state:changed",
  transcriptDelta: "transcript:delta",
  transcriptFinal: "transcript:final",
  transcriptionError: "transcription:error",
  listDesktopSources: "desktop-sources:list",
  selectDesktopSource: "desktop-sources:select",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  settingsChanged: "settings:changed",
  answerGenerate: "answer:generate",
  meetingSummaryGenerate: "meeting-summary:generate",
  meetingNotesSave: "meeting-notes:save",
  meetingNotesReveal: "meeting-notes:reveal",
  realtimeToken: "realtime:token",
  overlaySet: "overlay:set",
  windowMinimize: "window:minimize",
  windowToggleMaximize: "window:toggle-maximize",
  windowClose: "window:close"
} as const;

export interface DesktopSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

export interface TranscriptDelta {
  itemId: string;
  delta: string;
}

export interface TranscriptFinal {
  itemId: string;
  transcript: string;
}

export const SaveMeetingNoteRequestSchema = z.object({
  transcript: z.string().min(1).max(200_000),
  summary: MeetingSummarySchema.nullable(),
  language: z.string().min(2).max(10),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime()
});
export type SaveMeetingNoteRequest = z.infer<typeof SaveMeetingNoteRequestSchema>;

export interface CopilotApi {
  capture: {
    start(): Promise<void>;
    stop(): Promise<void>;
    cancel(): Promise<void>;
    sendAudioChunk(chunk: ArrayBuffer): void;
  };
  desktopSources: {
    list(): Promise<DesktopSource[]>;
    select(id: string): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  backend: {
    createRealtimeToken(request: RealtimeTokenRequest): Promise<RealtimeTokenResponse>;
    generateAnswer(request: AnswerRequest): Promise<AnswerResponse>;
    generateMeetingSummary(request: MeetingSummaryRequest): Promise<MeetingSummaryResponse>;
  };
  meetingNotes: {
    save(request: SaveMeetingNoteRequest): Promise<SavedMeetingNote>;
    reveal(filePath: string): Promise<void>;
  };
  window: {
    setOverlay(enabled: boolean): Promise<void>;
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
  };
  events: {
    onHotkeyPressed(listener: () => void): () => void;
    onHotkeyReleased(listener: () => void): () => void;
    onSettingsChanged(listener: (settings: AppSettings) => void): () => void;
    onStateChanged(listener: (state: CaptureState) => void): () => void;
    onTranscriptDelta(listener: (event: TranscriptDelta) => void): () => void;
    onTranscriptFinal(listener: (event: TranscriptFinal) => void): () => void;
    onTranscriptionError(listener: (message: string) => void): () => void;
  };
}
