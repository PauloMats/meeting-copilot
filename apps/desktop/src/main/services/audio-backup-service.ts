import { mkdir, open, rename, rm, stat, type FileHandle } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const WAV_HEADER_BYTES = 44;

export class AudioBackupService {
  private file: FileHandle | null = null;
  private partialPath: string | null = null;
  private finalPath: string | null = null;
  private dataBytes = 0;
  private writeQueue: Promise<void> = Promise.resolve();
  private writeError: Error | null = null;

  constructor(private readonly documentsDirectory: string) {}

  async start(startedAt = new Date()): Promise<void> {
    if (this.file) throw new Error("An audio backup is already active");
    const recordingsDirectory = join(documentsDirectoryFor(this.documentsDirectory), "Recordings");
    await mkdir(recordingsDirectory, { recursive: true });

    const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
    this.finalPath = join(recordingsDirectory, `meeting-${timestamp}.wav`);
    this.partialPath = `${this.finalPath}.part`;
    this.dataBytes = 0;
    this.writeError = null;
    this.writeQueue = Promise.resolve();
    this.file = await open(this.partialPath, "w");
    await this.file.write(createWavHeader(0));
  }

  append(chunk: ArrayBuffer): void {
    const file = this.file;
    if (!file || this.writeError) return;
    const bytes = Buffer.from(chunk.slice(0));
    this.dataBytes += bytes.length;
    this.writeQueue = this.writeQueue
      .then(async () => {
        await file.write(bytes);
      })
      .catch((cause: unknown) => {
        this.writeError = cause instanceof Error ? cause : new Error("Could not save audio backup");
      });
  }

  async stop(): Promise<string | null> {
    const file = this.file;
    const partialPath = this.partialPath;
    const finalPath = this.finalPath;
    if (!file || !partialPath || !finalPath) return null;

    this.file = null;
    try {
      await this.writeQueue;
      if (this.writeError) throw this.writeError;
      await file.write(createWavHeader(this.dataBytes), 0, WAV_HEADER_BYTES, 0);
      await file.sync();
      await file.close();
      await rename(partialPath, finalPath);
      return finalPath;
    } catch (cause) {
      await file.close().catch(() => undefined);
      throw cause;
    } finally {
      this.reset();
    }
  }

  async cancel(): Promise<void> {
    const file = this.file;
    const partialPath = this.partialPath;
    this.file = null;
    await this.writeQueue;
    await file?.close().catch(() => undefined);
    if (partialPath) await rm(partialPath, { force: true });
    this.reset();
  }

  async reveal(filePath: string): Promise<string> {
    if (!this.isManagedFile(filePath)) throw new Error("Invalid audio backup path");
    await stat(filePath);
    return filePath;
  }

  isManagedFile(filePath: string): boolean {
    const recordingsDirectory = resolve(
      join(documentsDirectoryFor(this.documentsDirectory), "Recordings")
    );
    const resolved = resolve(filePath);
    return (
      dirname(resolved) === recordingsDirectory &&
      basename(resolved).startsWith("meeting-") &&
      basename(resolved).endsWith(".wav")
    );
  }

  private reset(): void {
    this.partialPath = null;
    this.finalPath = null;
    this.dataBytes = 0;
    this.writeQueue = Promise.resolve();
    this.writeError = null;
  }
}

function documentsDirectoryFor(documentsDirectory: string): string {
  return join(documentsDirectory, "Meeting Copilot");
}

function createWavHeader(dataBytes: number): Buffer {
  if (dataBytes > 0xffffffff - 36) {
    throw new Error("Audio backup is too large for the WAV format");
  }
  const header = Buffer.alloc(WAV_HEADER_BYTES);
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataBytes, 40);
  return header;
}
