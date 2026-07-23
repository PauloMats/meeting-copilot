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
  type LoadedMeetingNote,
  type SavedMeetingNoteEntry,
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
  listAudioDevices: "audio-devices:list",
  selectAudioDevice: "audio-devices:select",
  nativeAudioStart: "native-audio:start",
  nativeAudioStop: "native-audio:stop",
  nativeAudioChunk: "native-audio:chunk",
  nativeAudioLevels: "native-audio:levels",
  nativeAudioError: "native-audio:error",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  settingsChanged: "settings:changed",
  answerGenerate: "answer:generate",
  meetingSummaryGenerate: "meeting-summary:generate",
  meetingNotesSave: "meeting-notes:save",
  meetingNotesList: "meeting-notes:list",
  meetingNotesRead: "meeting-notes:read",
  meetingNotesUpdate: "meeting-notes:update",
  meetingNotesReveal: "meeting-notes:reveal",
  realtimeToken: "realtime:token",
  overlaySet: "overlay:set",
  windowMinimize: "window:minimize",
  windowToggleMaximize: "window:toggle-maximize",
  windowClose: "window:close"
} as const;

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isDefaultCommunications: boolean;
}

export interface AudioLevels {
  system: number;
  microphone: number | null;
}

export interface NativeAudioSession {
  outputDevice: string;
  microphoneDevice: string | null;
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
  systemAudio: {
    listDevices(): Promise<AudioDevice[]>;
    select(id: string): Promise<void>;
    start(includeMicrophone: boolean): Promise<NativeAudioSession>;
    stop(): Promise<void>;
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
    list(): Promise<SavedMeetingNoteEntry[]>;
    read(filePath: string): Promise<LoadedMeetingNote>;
    update(filePath: string, request: SaveMeetingNoteRequest): Promise<SavedMeetingNote>;
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
    onNativeAudioChunk(listener: (chunk: ArrayBuffer) => void): () => void;
    onNativeAudioLevels(listener: (levels: AudioLevels) => void): () => void;
    onNativeAudioError(listener: (message: string) => void): () => void;
  };
}
