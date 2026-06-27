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

export class AudioCapture {
  private context: AudioContext | null = null;
  private streams: MediaStream[] = [];

  async start(includeMicrophone: boolean, onChunk: (chunk: ArrayBuffer) => void): Promise<void> {
    if (this.context) return;
    const desktop = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { channelCount: 1, sampleRate: 48000 }
    });
    this.streams.push(desktop);

    if (includeMicrophone) {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.streams.push(microphone);
    }

    const context = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
    const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
    await context.audioWorklet.addModule(moduleUrl);
    URL.revokeObjectURL(moduleUrl);

    const mix = context.createGain();
    for (const stream of this.streams) {
      if (stream.getAudioTracks().length > 0) {
        context.createMediaStreamSource(stream).connect(mix);
      }
    }
    const worklet = new AudioWorkletNode(context, "pcm-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data);
    mix.connect(worklet);
    this.context = context;
  }

  async stop(): Promise<void> {
    for (const stream of this.streams) {
      for (const track of stream.getTracks()) track.stop();
    }
    this.streams = [];
    await this.context?.close();
    this.context = null;
  }
}
