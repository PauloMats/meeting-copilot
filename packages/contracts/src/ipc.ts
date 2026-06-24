import type {
  AnswerRequest,
  AnswerResponse,
  RealtimeTokenRequest,
  RealtimeTokenResponse
} from "./api.js";
import type { AppSettings, CaptureState } from "./domain.js";

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
  realtimeToken: "realtime:token",
  overlaySet: "overlay:set"
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
  };
  window: {
    setOverlay(enabled: boolean): Promise<void>;
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
