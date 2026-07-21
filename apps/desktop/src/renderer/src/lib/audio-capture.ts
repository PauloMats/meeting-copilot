const WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(0);
    this.chunkSamples = 2400;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    const ratio = sampleRate / 24000;
    const outputLength = Math.floor(input.length / ratio);
    const pcm = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), input.length);
      let sum = 0;
      for (let j = start; j < end; j++) sum += input[j];
      const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    const merged = new Int16Array(this.buffer.length + pcm.length);
    merged.set(this.buffer);
    merged.set(pcm, this.buffer.length);
    let offset = 0;
    while (merged.length - offset >= this.chunkSamples) {
      const chunk = merged.slice(offset, offset + this.chunkSamples);
      this.port.postMessage(chunk.buffer, [chunk.buffer]);
      offset += this.chunkSamples;
    }
    this.buffer = merged.slice(offset);
    return true;
  }
}
registerProcessor("pcm-capture", PcmCaptureProcessor);
`;

export interface AudioLevels {
  system: number;
  microphone: number | null;
}

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
    super("No system audio track was provided by the selected source");
    this.name = "SystemAudioUnavailableError";
  }
}

export function calculateAudioLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumOfSquares = 0;
  for (const sample of samples) sumOfSquares += sample * sample;
  const rms = Math.sqrt(sumOfSquares / samples.length);
  if (rms < 0.001) return 0;
  const decibels = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (decibels + 60) / 60));
}

function createMeter(context: AudioContext): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  return analyser;
}

function readMeter(analyser: AnalyserNode): number {
  const samples = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(samples);
  return calculateAudioLevel(samples);
}

export class AudioCapture {
  private context: AudioContext | null = null;
  private streams: MediaStream[] = [];
  private meterTimer: number | null = null;
  private levelListener: ((levels: AudioLevels) => void) | null = null;

  async start(
    includeMicrophone: boolean,
    onChunk: (chunk: ArrayBuffer) => void,
    onLevels?: (levels: AudioLevels) => void
  ): Promise<void> {
    if (this.context) return;
    let desktop: MediaStream;
    try {
      desktop = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch (cause) {
      throw new AudioSourceStartError(
        "system",
        cause instanceof Error ? cause.message : "Could not start system audio"
      );
    }
    if (desktop.getAudioTracks().length === 0) {
      for (const track of desktop.getTracks()) track.stop();
      throw new SystemAudioUnavailableError();
    }
    this.streams.push(desktop);

    let microphone: MediaStream | null = null;
    if (includeMicrophone) {
      try {
        microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (cause) {
        throw new AudioSourceStartError(
          "microphone",
          cause instanceof Error ? cause.message : "Could not start microphone"
        );
      }
      this.streams.push(microphone);
    }

    const context = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
    const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
    try {
      await context.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }

    const mix = context.createGain();
    const systemMeter = createMeter(context);
    context.createMediaStreamSource(desktop).connect(systemMeter).connect(mix);

    const microphoneMeter = microphone ? createMeter(context) : null;
    if (microphone && microphoneMeter) {
      context.createMediaStreamSource(microphone).connect(microphoneMeter).connect(mix);
    }

    const worklet = new AudioWorkletNode(context, "pcm-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data);
    mix.connect(worklet);
    this.context = context;
    this.levelListener = onLevels ?? null;
    if (onLevels) {
      onLevels({ system: 0, microphone: microphoneMeter ? 0 : null });
      this.meterTimer = window.setInterval(() => {
        onLevels({
          system: readMeter(systemMeter),
          microphone: microphoneMeter ? readMeter(microphoneMeter) : null
        });
      }, 100);
    }
  }

  async stop(): Promise<void> {
    if (this.meterTimer !== null) {
      window.clearInterval(this.meterTimer);
      this.meterTimer = null;
    }
    for (const stream of this.streams) {
      for (const track of stream.getTracks()) track.stop();
    }
    this.streams = [];
    await this.context?.close();
    this.context = null;
    this.levelListener?.({ system: 0, microphone: null });
    this.levelListener = null;
  }
}
