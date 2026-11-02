import type { Room } from "../types";

const SNAP_DISTANCE = 20;

export function snapRoomPosition(
  room: Room,
  x: number,
  y: number,
  wallThickness: number,
  otherRooms: Room[],
  wallThicknesses: Record<string, number> = {},
) {
  let snappedX = x;
  let snappedY = y;
  let closestXDistance = SNAP_DISTANCE + 1;
  let closestYDistance = SNAP_DISTANCE + 1;

  for (const other of otherRooms) {
    const verticalOverlap =
      Math.min(y + room.length, other.y + other.length) >
      Math.max(y, other.y);
    const nearHorizontalSide =
      Math.min(
        Math.abs(y + room.length - other.y),
        Math.abs(y - (other.y + other.length)),
      ) <= SNAP_DISTANCE;

    if (verticalOverlap || nearHorizontalSide) {
      const movingLeftThickness =
        wallThicknesses[`${room.id}-left`] ?? wallThickness;
      const movingRightThickness =
        wallThicknesses[`${room.id}-right`] ?? wallThickness;
      const xCandidates = [
        ...(verticalOverlap
          ? [
              other.x + other.width + movingLeftThickness,
              other.x - room.width - movingRightThickness,
            ]
          : []),
        ...(nearHorizontalSide
          ? [other.x, other.x + other.width - room.width]
          : []),
      ];

      for (const candidate of xCandidates) {
        const distance = Math.abs(candidate - x);

        if (distance < closestXDistance) {
          snappedX = candidate;
          closestXDistance = distance;
        }
      }
    }

    const horizontalOverlap =
      Math.min(x + room.width, other.x + other.width) >
      Math.max(x, other.x);
    const nearVerticalSide =
      Math.min(
        Math.abs(x + room.width - other.x),
        Math.abs(x - (other.x + other.width)),
      ) <= SNAP_DISTANCE;

    if (horizontalOverlap || nearVerticalSide) {
      const movingTopThickness =
        wallThicknesses[`${room.id}-top`] ?? wallThickness;
      const movingBottomThickness =
        wallThicknesses[`${room.id}-bottom`] ?? wallThickness;
      const yCandidates = [
        ...(horizontalOverlap
          ? [
              other.y + other.length + movingTopThickness,
              other.y - room.length - movingBottomThickness,
            ]
          : []),
        ...(nearVerticalSide
          ? [other.y, other.y + other.length - room.length]
          : []),
      ];

      for (const candidate of yCandidates) {
        const distance = Math.abs(candidate - y);

        if (distance < closestYDistance) {
          snappedY = candidate;
          closestYDistance = distance;
        }
      }
    }
  }

  return { x: snappedX, y: snappedY };
}
