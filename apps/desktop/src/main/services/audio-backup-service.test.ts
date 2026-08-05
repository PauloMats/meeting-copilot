import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AudioBackupService } from "./audio-backup-service.js";

let testDirectory: string | null = null;

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = null;
});

describe("AudioBackupService", () => {
  it("writes native PCM chunks as a valid 24 kHz mono WAV file", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-audio-"));
    const service = new AudioBackupService(testDirectory);
    const pcm = new Uint8Array([1, 2, 3, 4, 5, 6]);

    await service.start(new Date("2026-08-05T12:30:00.000Z"));
    service.append(pcm.buffer);
    const filePath = await service.stop();

    expect(filePath).toContain(join("Meeting Copilot", "Recordings"));
    const wav = await readFile(filePath!);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(pcm.byteLength);
    expect([...wav.subarray(44)]).toEqual([...pcm]);
    expect(service.isManagedFile(filePath!)).toBe(true);
  });

  it("removes an incomplete backup when capture is cancelled", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "meeting-copilot-audio-"));
    const service = new AudioBackupService(testDirectory);

    await service.start(new Date("2026-08-05T12:30:00.000Z"));
    service.append(new Uint8Array([1, 2]).buffer);
    await service.cancel();

    const files = await readdir(join(testDirectory, "Meeting Copilot", "Recordings"));
    expect(files).toEqual([]);
  });
});
