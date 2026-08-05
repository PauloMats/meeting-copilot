import type {
  AppSettings,
  CaptureMode,
  CaptureStartResult,
  CaptureStopResult
} from "@meeting-copilot/contracts";
import type { AudioBackupService } from "./audio-backup-service.js";
import type { RealtimeTranscriptionService } from "./realtime-transcription-service.js";

type LiveTranscription = Pick<
  RealtimeTranscriptionService,
  "start" | "append" | "commit" | "cancel"
>;
type AudioBackup = Pick<AudioBackupService, "start" | "append" | "stop" | "cancel">;

export class CaptureSessionService {
  private mode: CaptureMode | null = null;
  private fallbackPromise: Promise<CaptureStartResult | null> | null = null;
  private fallbackChunks: ArrayBuffer[] = [];

  constructor(
    private readonly transcription: LiveTranscription,
    private readonly audioBackup: AudioBackup
  ) {}

  async start(settings: AppSettings): Promise<CaptureStartResult> {
    try {
      await this.transcription.start(settings);
      this.mode = "live_transcription";
      return { mode: this.mode, warning: null };
    } catch (cause) {
      this.transcription.cancel();
      await this.audioBackup.start();
      this.mode = "audio_backup";
      return {
        mode: this.mode,
        warning: cause instanceof Error ? cause.message : "Live transcription is unavailable"
      };
    }
  }

  append(chunk: ArrayBuffer): void {
    if (this.fallbackPromise) this.fallbackChunks.push(chunk.slice(0));
    else if (this.mode === "audio_backup") this.audioBackup.append(chunk);
    else if (this.mode === "live_transcription") this.transcription.append(chunk);
  }

  async stop(): Promise<CaptureStopResult> {
    await this.fallbackPromise;
    if (this.mode === "audio_backup") {
      const audioBackupPath = await this.audioBackup.stop();
      this.mode = null;
      return { mode: "audio_backup", audioBackupPath };
    }
    this.transcription.commit();
    this.mode = null;
    return { mode: "live_transcription", audioBackupPath: null };
  }

  async cancel(): Promise<void> {
    await this.fallbackPromise?.catch(() => undefined);
    this.mode = null;
    this.fallbackChunks = [];
    this.transcription.cancel();
    await this.audioBackup.cancel();
  }

  async fallback(reason: string): Promise<CaptureStartResult | null> {
    if (this.fallbackPromise) return this.fallbackPromise;
    if (this.mode !== "live_transcription") return null;

    const transition = this.switchToAudioBackup(reason);
    this.fallbackPromise = transition;
    try {
      return await transition;
    } finally {
      if (this.fallbackPromise === transition) this.fallbackPromise = null;
    }
  }

  private async switchToAudioBackup(reason: string): Promise<CaptureStartResult> {
    this.transcription.cancel();
    try {
      await this.audioBackup.start();
      this.mode = "audio_backup";
      for (const chunk of this.fallbackChunks) this.audioBackup.append(chunk);
      this.fallbackChunks = [];
      return { mode: this.mode, warning: reason };
    } catch (cause) {
      this.mode = null;
      this.fallbackChunks = [];
      await this.audioBackup.cancel().catch(() => undefined);
      throw cause;
    }
  }
}
