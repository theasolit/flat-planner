export type ShapeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function closestSnap(
  candidates: number[],
  requested: number,
  snapDistance: number,
): number {
  return (
    candidates
      .map((value) => ({ value, distance: Math.abs(value - requested) }))
      .filter((candidate) => candidate.distance <= snapDistance)
      .sort((first, second) => first.distance - second.distance)[0]?.value ??
    requested
  );
}

export function snapShapePosition(
  moved: ShapeBounds,
  others: ShapeBounds[],
  requestedX: number,
  requestedY: number,
  snapDistance: number,
): { x: number; y: number } {
  const xCandidates = others.flatMap((other) =>
    [other.minX, other.maxX].flatMap((otherEdge) =>
      [moved.minX, moved.maxX].map(
        (movedEdge) => requestedX + otherEdge - movedEdge,
      ),
    ),
  );
  const yCandidates = others.flatMap((other) =>
    [other.minY, other.maxY].flatMap((otherEdge) =>
      [moved.minY, moved.maxY].map(
        (movedEdge) => requestedY + otherEdge - movedEdge,
      ),
    ),
  );

  return {
    x: closestSnap(xCandidates, requestedX, snapDistance),
    y: closestSnap(yCandidates, requestedY, snapDistance),
  };
}
