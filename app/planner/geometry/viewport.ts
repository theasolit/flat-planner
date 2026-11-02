import type { PlanBounds, WallSegment } from "../types";

type CanvasSize = {
  width: number;
  height: number;
};

export function getFloorPlanBounds(
  segments: WallSegment[],
): PlanBounds | null {
  if (segments.length === 0) {
    return null;
  }

  const minX = Math.min(
    ...segments.flatMap((segment) => [
      segment.start[0] - segment.thickness,
      segment.end[0] - segment.thickness,
    ]),
  );
  const minY = Math.min(
    ...segments.flatMap((segment) => [
      segment.start[1] - segment.thickness,
      segment.end[1] - segment.thickness,
    ]),
  );
  const maxX = Math.max(
    ...segments.flatMap((segment) => [
      segment.start[0] + segment.thickness,
      segment.end[0] + segment.thickness,
    ]),
  );
  const maxY = Math.max(
    ...segments.flatMap((segment) => [
      segment.start[1] + segment.thickness,
      segment.end[1] + segment.thickness,
    ]),
  );

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getFitScale(
  bounds: PlanBounds | null,
  canvasSize: CanvasSize,
): number {
  if (!bounds || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return 1;
  }

  return Math.min(
    Math.max(canvasSize.width - 64, 1) / (bounds.width / 2),
    Math.max(canvasSize.height - 64, 1) / (bounds.height / 2),
  );
}
