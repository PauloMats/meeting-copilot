import { describe, expect, it } from "vitest";
import { AudioSourceStartError, SystemAudioUnavailableError } from "./audio-capture";

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
