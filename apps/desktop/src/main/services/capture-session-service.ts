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
    if (this.mode === "audio_backup") this.audioBackup.append(chunk);
    else if (this.mode === "live_transcription") this.transcription.append(chunk);
  }

  async stop(): Promise<CaptureStopResult> {
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
    this.mode = null;
    this.transcription.cancel();
    await this.audioBackup.cancel();
  }
}
