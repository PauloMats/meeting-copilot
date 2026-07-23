import type { AudioLevels } from "@meeting-copilot/contracts";

export type { AudioLevels } from "@meeting-copilot/contracts";

export type AudioSourceKind = "system" | "microphone";

export class AudioSourceStartError extends Error {
  readonly code = "AUDIO_SOURCE_START_FAILED";

  constructor(
    readonly source: AudioSourceKind,
    readonly originalMessage: string
  ) {
    super(originalMessage);
    this.name = "AudioSourceStartError";
  }
}

export class SystemAudioUnavailableError extends Error {
  readonly code = "SYSTEM_AUDIO_UNAVAILABLE";

  constructor() {
    super("No active Windows output device was found");
    this.name = "SystemAudioUnavailableError";
  }
}

export class AudioCapture {
  private active = false;
  private paused = false;
  private includeMicrophone = false;
  private disposers: Array<() => void> = [];
  private levelListener: ((levels: AudioLevels) => void) | null = null;

  async start(
    includeMicrophone: boolean,
    onChunk: (chunk: ArrayBuffer) => void,
    onLevels?: (levels: AudioLevels) => void,
    onError?: (message: string) => void
  ): Promise<void> {
    if (this.active) return;

    this.includeMicrophone = includeMicrophone;
    this.levelListener = onLevels ?? null;
    this.disposers = [
      window.copilot.events.onNativeAudioChunk(onChunk),
      window.copilot.events.onNativeAudioLevels((levels) => onLevels?.(levels)),
      window.copilot.events.onNativeAudioError((message) => onError?.(message))
    ];
    onLevels?.({ system: 0, microphone: includeMicrophone ? 0 : null });

    try {
      await this.startNative();
      this.active = true;
    } catch (cause) {
      this.disposeSubscriptions();
      throw toAudioSourceStartError(cause);
    }
  }

  async pause(): Promise<void> {
    if (!this.active || this.paused) return;
    await window.copilot.systemAudio.stop();
    this.active = false;
    this.paused = true;
    this.levelListener?.({
      system: 0,
      microphone: this.includeMicrophone ? 0 : null
    });
  }

  async resume(): Promise<void> {
    if (!this.paused || this.active) return;
    try {
      await this.startNative();
      this.active = true;
      this.paused = false;
    } catch (cause) {
      throw toAudioSourceStartError(cause);
    }
  }

  async stop(): Promise<void> {
    if (this.active) await window.copilot.systemAudio.stop();
    this.active = false;
    this.paused = false;
    this.disposeSubscriptions();
    this.levelListener?.({ system: 0, microphone: null });
    this.levelListener = null;
  }

  private async startNative(): Promise<void> {
    await window.copilot.systemAudio.start(this.includeMicrophone);
  }

  private disposeSubscriptions(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
  }
}

function toAudioSourceStartError(cause: unknown): AudioSourceStartError {
  const message = cause instanceof Error ? cause.message : "Could not start WASAPI capture";
  const source = /microphone/i.test(message) ? "microphone" : "system";
  return new AudioSourceStartError(source, message);
}
