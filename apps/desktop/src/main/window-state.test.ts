import { describe, expect, it } from "vitest";
import { clampBoundsToWorkArea, defaultBoundsForMode } from "./window-state.js";

describe("overlay window positioning", () => {
  const workArea = { x: 1920, y: 0, width: 1920, height: 1040 };

  it("recovers a window from a removed monitor", () => {
    expect(clampBoundsToWorkArea({ x: -2200, y: 1600, width: 500, height: 380 }, workArea)).toEqual(
      { x: 1932, y: 648, width: 500, height: 380 }
    );
  });

  it("places compact mode in the current display work area", () => {
    expect(defaultBoundsForMode("compact", workArea)).toEqual({
      x: 3316,
      y: 24,
      width: 500,
      height: 380
    });
  });
});
