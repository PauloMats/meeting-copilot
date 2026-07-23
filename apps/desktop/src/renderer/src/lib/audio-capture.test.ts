import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioCapture, AudioSourceStartError, SystemAudioUnavailableError } from "./audio-capture";

describe("native audio errors", () => {
  it("identifies which Windows audio source failed", () => {
    const error = new AudioSourceStartError("system", "Could not start audio source");
    expect(error.code).toBe("AUDIO_SOURCE_START_FAILED");
    expect(error.source).toBe("system");
    expect(error.message).toBe("Could not start audio source");
  });

  it("reports when Windows has no active output endpoint", () => {
    const error = new SystemAudioUnavailableError();
    expect(error.code).toBe("SYSTEM_AUDIO_UNAVAILABLE");
    expect(error.message).toContain("Windows output device");
  });
});

describe("AudioCapture pause and resume", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("restarts WASAPI without duplicating event subscriptions", async () => {
    const start = vi.fn().mockResolvedValue({
      outputDevice: "JBL Quantum",
      microphoneDevice: "JBL microphone"
    });
    const stop = vi.fn().mockResolvedValue(undefined);
    const onNativeAudioChunk = vi.fn().mockReturnValue(vi.fn());
    const onNativeAudioLevels = vi.fn().mockReturnValue(vi.fn());
    const onNativeAudioError = vi.fn().mockReturnValue(vi.fn());
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        copilot: {
          systemAudio: { start, stop },
          events: {
            onNativeAudioChunk,
            onNativeAudioLevels,
            onNativeAudioError
          }
        }
      }
    });

    const capture = new AudioCapture();
    const onLevels = vi.fn();
    await capture.start(true, vi.fn(), onLevels);
    await capture.pause();
    await capture.resume();
    await capture.stop();

    expect(start).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenNthCalledWith(1, true);
    expect(start).toHaveBeenNthCalledWith(2, true);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(onNativeAudioChunk).toHaveBeenCalledTimes(1);
    expect(onNativeAudioLevels).toHaveBeenCalledTimes(1);
    expect(onNativeAudioError).toHaveBeenCalledTimes(1);
    expect(onLevels).toHaveBeenCalledWith({ system: 0, microphone: 0 });
  });
});
