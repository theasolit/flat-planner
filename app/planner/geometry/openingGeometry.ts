import type { WallOpening } from "../types";

export type OpeningSlot = { offset: number; width: number };

export function findOpeningSlot(
  sourceId: string,
  openings: WallOpening[],
  edgeLength: number,
): OpeningSlot | undefined {
  if (!Number.isFinite(edgeLength) || edgeLength <= 0) {
    return undefined;
  }

  const edgeOpenings = openings
    .filter((opening) => opening.sourceId === sourceId)
    .sort((a, b) => a.offset - b.offset);

  let cursor = 0;

  for (const opening of edgeOpenings) {
    if (opening.offset > cursor) {
      return {
        offset: cursor,
        width: Math.min(90, opening.offset - cursor),
      };
    }

    cursor = Math.max(cursor, opening.offset + opening.width);
  }

  if (cursor < edgeLength) {
    return {
      offset: cursor,
      width: Math.min(90, edgeLength - cursor),
    };
  }

  return undefined;
}

export function findOpeningOffset(
  requestedOffset: number,
  openingWidth: number,
  edgeLength: number,
  neighbors: WallOpening[],
): number | undefined {
  if (
    !Number.isFinite(requestedOffset) ||
    !Number.isFinite(openingWidth) ||
    !Number.isFinite(edgeLength) ||
    openingWidth <= 0 ||
    openingWidth > edgeLength
  ) {
    return undefined;
  }

  let cursor = 0;
  let bestOffset: number | undefined;
  let bestDistance = Infinity;

  function considerGap(end: number) {
    const latestStart = end - openingWidth;

    if (latestStart < cursor) {
      return;
    }

    const candidate = Math.min(
      Math.max(requestedOffset, cursor),
      latestStart,
    );
    const distance = Math.abs(candidate - requestedOffset);

    if (distance < bestDistance) {
      bestOffset = candidate;
      bestDistance = distance;
    }
  }

  for (const neighbor of [...neighbors].sort((a, b) => a.offset - b.offset)) {
    considerGap(neighbor.offset);
    cursor = Math.max(cursor, neighbor.offset + neighbor.width);
  }

  considerGap(edgeLength);
  return bestOffset;
}
