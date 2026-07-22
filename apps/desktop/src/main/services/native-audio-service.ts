import type { AudioDevice, AudioLevels, NativeAudioSession } from "@meeting-copilot/contracts";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";

const PCM_CHUNK_BYTES = 2_400 * 2;

interface NativeAudioEvent {
  event?: string;
  source?: "system" | "microphone";
  message?: string;
  outputDevice?: string;
  microphoneDevice?: string | null;
  system?: number;
  microphone?: number | null;
}

interface NativeAudioCallbacks {
  chunk(chunk: ArrayBuffer): void;
  levels(levels: AudioLevels): void;
  error(message: string): void;
}

export class NativeAudioService {
  private process: ChildProcessWithoutNullStreams | null = null;
  private selectedDeviceId: string | null = null;
  private readonly expectedStops = new WeakSet<ChildProcessWithoutNullStreams>();

  constructor(
    private readonly executablePath: string,
    private readonly callbacks: NativeAudioCallbacks
  ) {}

  async listDevices(): Promise<AudioDevice[]> {
    this.assertAvailable();
    const output = await new Promise<string>((resolve, reject) => {
      execFile(
        this.executablePath,
        ["--list"],
        { encoding: "utf8", windowsHide: true, timeout: 10_000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(stdout);
        }
      );
    });
    const devices = JSON.parse(output) as AudioDevice[];
    if (!Array.isArray(devices)) throw new Error("Invalid response from the WASAPI helper");
    return devices;
  }

  selectDevice(id: string): void {
    this.selectedDeviceId = id;
  }

  async start(includeMicrophone: boolean): Promise<NativeAudioSession> {
    if (this.process) throw new Error("WASAPI capture is already active");
    this.assertAvailable();

    const args: string[] = [];
    if (this.selectedDeviceId) args.push("--device-id", this.selectedDeviceId);
    if (includeMicrophone) args.push("--microphone");

    const child = spawn(this.executablePath, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    this.process = child;

    let pcmBuffer = Buffer.alloc(0);
    child.stdout.on("data", (data: Buffer) => {
      pcmBuffer = Buffer.concat([pcmBuffer, data]);
      while (pcmBuffer.length >= PCM_CHUNK_BYTES) {
        const chunk = pcmBuffer.subarray(0, PCM_CHUNK_BYTES);
        pcmBuffer = pcmBuffer.subarray(PCM_CHUNK_BYTES);
        const copy = new Uint8Array(chunk);
        this.callbacks.chunk(copy.buffer);
      }
    });

    return new Promise<NativeAudioSession>((resolve, reject) => {
      let settled = false;
      let stderrBuffer = "";
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        void this.stop();
        reject(new Error("The WASAPI helper did not start within 8 seconds"));
      }, 8_000);

      const finishStart = (event: NativeAudioEvent) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({
          outputDevice: event.outputDevice ?? "Windows output",
          microphoneDevice: event.microphoneDevice ?? null
        });
      };

      const failStart = (message: string) => {
        if (settled) {
          this.expectedStops.add(child);
          this.callbacks.error(message);
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (this.process === child) {
          this.expectedStops.add(child);
          this.process = null;
          child.kill();
        }
        reject(new Error(message));
      };

      child.stderr.on("data", (data: Buffer) => {
        stderrBuffer += data.toString("utf8");
        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as NativeAudioEvent;
            if (event.event === "ready") finishStart(event);
            else if (event.event === "levels") {
              this.callbacks.levels({
                system: event.system ?? 0,
                microphone: event.microphone ?? null
              });
            } else if (event.event === "error") {
              const prefix = event.source === "microphone" ? "Microphone" : "System audio";
              failStart(`${prefix}: ${event.message ?? "native capture failed"}`);
            }
          } catch {
            failStart(line.trim());
          }
        }
      });

      child.on("error", (error) => failStart(error.message));
      child.on("exit", (code) => {
        if (this.process === child) this.process = null;
        if (this.expectedStops.has(child)) return;
        failStart(`WASAPI capture exited unexpectedly (code ${code ?? "unknown"})`);
      });
    });
  }

  stop(): Promise<void> {
    const child = this.process;
    if (!child) return Promise.resolve();
    this.expectedStops.add(child);
    this.process = null;
    child.kill();
    this.callbacks.levels({ system: 0, microphone: null });
    return Promise.resolve();
  }

  private assertAvailable(): void {
    if (process.platform !== "win32") {
      throw new Error("Native WASAPI capture is available only on Windows");
    }
    if (!existsSync(this.executablePath)) {
      throw new Error(`WASAPI helper was not found at ${this.executablePath}`);
    }
  }
}
