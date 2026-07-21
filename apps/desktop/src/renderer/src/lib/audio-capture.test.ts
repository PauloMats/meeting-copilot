import { describe, expect, it } from "vitest";
import { calculateAudioLevel } from "./audio-capture";

describe("calculateAudioLevel", () => {
  it("returns zero for silence and very low noise", () => {
    expect(calculateAudioLevel(new Float32Array(32))).toBe(0);
    expect(calculateAudioLevel(new Float32Array(32).fill(0.0005))).toBe(0);
  });

  it("maps audible samples onto the normalized meter range", () => {
    const level = calculateAudioLevel(new Float32Array(32).fill(0.1));
    expect(level).toBeCloseTo(2 / 3, 4);
  });

  it("clamps full-scale audio to one", () => {
    expect(calculateAudioLevel(new Float32Array(32).fill(1))).toBe(1);
  });
});
