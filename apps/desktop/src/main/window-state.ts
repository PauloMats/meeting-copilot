import type { AppWindowMode } from "@meeting-copilot/contracts";

export interface RectangleLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WINDOW_SIZE: Record<
  Exclude<AppWindowMode, "hidden">,
  { width: number; height: number }
> = {
  main: { width: 1160, height: 780 },
  minimized: { width: 280, height: 72 },
  compact: { width: 500, height: 380 },
  expanded: { width: 680, height: 680 }
};

export function clampBoundsToWorkArea(
  bounds: RectangleLike,
  workArea: RectangleLike,
  margin = 12
): RectangleLike {
  const maxWidth = Math.max(240, workArea.width - margin * 2);
  const maxHeight = Math.max(64, workArea.height - margin * 2);
  const width = Math.min(Math.max(bounds.width, 240), maxWidth);
  const height = Math.min(Math.max(bounds.height, 64), maxHeight);
  const minX = workArea.x + margin;
  const minY = workArea.y + margin;
  const maxX = workArea.x + workArea.width - width - margin;
  const maxY = workArea.y + workArea.height - height - margin;

  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(bounds.y, minY), Math.max(minY, maxY))
  };
}

export function defaultBoundsForMode(
  mode: Exclude<AppWindowMode, "hidden">,
  workArea: RectangleLike
): RectangleLike {
  const size = WINDOW_SIZE[mode];
  return clampBoundsToWorkArea(
    {
      ...size,
      x: workArea.x + workArea.width - size.width - 24,
      y: workArea.y + 24
    },
    workArea
  );
}
