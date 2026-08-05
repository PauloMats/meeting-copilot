import { DEFAULT_SETTINGS } from "@meeting-copilot/contracts";
import { describe, expect, it, vi } from "vitest";
import { CaptureSessionService } from "./capture-session-service.js";

function createDependencies() {
  const transcription = {
    start: vi.fn().mockResolvedValue(undefined),
    append: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn()
  };
  const audioBackup = {
    start: vi.fn().mockResolvedValue(undefined),
    append: vi.fn(),
    stop: vi.fn().mockResolvedValue("C:\\Documents\\Meeting Copilot\\Recordings\\meeting.wav"),
    cancel: vi.fn().mockResolvedValue(undefined)
  };
  return { transcription, audioBackup };
}

describe("CaptureSessionService", () => {
  it("continues in local audio backup mode when realtime credentials fail", async () => {
    const { transcription, audioBackup } = createDependencies();
    transcription.start.mockRejectedValueOnce(new Error("You have no credits remaining"));
    const service = new CaptureSessionService(transcription, audioBackup);
    const chunk = new Uint8Array([1, 2]).buffer;

    await expect(service.start(DEFAULT_SETTINGS)).resolves.toEqual({
      mode: "audio_backup",
      warning: "You have no credits remaining"
    });
    service.append(chunk);
    await expect(service.stop()).resolves.toEqual({
      mode: "audio_backup",
      audioBackupPath: "C:\\Documents\\Meeting Copilot\\Recordings\\meeting.wav"
    });

    expect(transcription.cancel).toHaveBeenCalledOnce();
    expect(audioBackup.start).toHaveBeenCalledOnce();
    expect(audioBackup.append).toHaveBeenCalledWith(chunk);
    expect(audioBackup.stop).toHaveBeenCalledOnce();
    expect(transcription.commit).not.toHaveBeenCalled();
  });

  it("keeps sending chunks to realtime transcription when credentials are available", async () => {
    const { transcription, audioBackup } = createDependencies();
    const service = new CaptureSessionService(transcription, audioBackup);
    const chunk = new Uint8Array([3, 4]).buffer;

    await expect(service.start(DEFAULT_SETTINGS)).resolves.toEqual({
      mode: "live_transcription",
      warning: null
    });
    service.append(chunk);
    await expect(service.stop()).resolves.toEqual({
      mode: "live_transcription",
      audioBackupPath: null
    });

    expect(transcription.append).toHaveBeenCalledWith(chunk);
    expect(transcription.commit).toHaveBeenCalledOnce();
    expect(audioBackup.start).not.toHaveBeenCalled();
  });
});
