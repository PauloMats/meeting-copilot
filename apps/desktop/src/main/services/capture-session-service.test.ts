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

  it("switches an open realtime session to local backup after an asynchronous provider error", async () => {
    const { transcription, audioBackup } = createDependencies();
    const service = new CaptureSessionService(transcription, audioBackup);
    const chunkDuringTransition = new Uint8Array([5, 6]).buffer;
    const chunkAfterTransition = new Uint8Array([7, 8]).buffer;
    let finishBackupStart: (() => void) | undefined;
    audioBackup.start.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishBackupStart = resolve))
    );

    await service.start(DEFAULT_SETTINGS);
    const fallback = service.fallback("You have no credits remaining");
    service.append(chunkDuringTransition);
    finishBackupStart?.();

    await expect(fallback).resolves.toEqual({
      mode: "audio_backup",
      warning: "You have no credits remaining"
    });
    service.append(chunkAfterTransition);
    await expect(service.stop()).resolves.toEqual({
      mode: "audio_backup",
      audioBackupPath: "C:\\Documents\\Meeting Copilot\\Recordings\\meeting.wav"
    });

    expect(transcription.cancel).toHaveBeenCalledOnce();
    expect(audioBackup.append).toHaveBeenNthCalledWith(1, chunkDuringTransition);
    expect(audioBackup.append).toHaveBeenNthCalledWith(2, chunkAfterTransition);
    expect(transcription.commit).not.toHaveBeenCalled();
  });

  it("ignores a late fallback request after the capture has stopped", async () => {
    const { transcription, audioBackup } = createDependencies();
    const service = new CaptureSessionService(transcription, audioBackup);

    await service.start(DEFAULT_SETTINGS);
    await service.stop();

    await expect(service.fallback("late provider error")).resolves.toBeNull();
    expect(audioBackup.start).not.toHaveBeenCalled();
  });
});
