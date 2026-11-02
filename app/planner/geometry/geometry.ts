import polygonClipping, { type MultiPolygon } from "polygon-clipping";
import type {
  ComponentWall,
  ComponentBounds,
  FurnitureTemplate,
  Pair,
  PlanBounds,
  Room,
  RoomBoundaryEdge,
  RoomComponent,
  WallOpening,
  WallSegment,
} from "../types";

const POLYGON_COORDINATE_SCALE = 1e8;

export function getRoomComponents(room: Room): RoomComponent[] {
  return room.components;
}

export function getComponentRing(component: RoomComponent): Pair[] {
  const centerX = component.x + component.width / 2;
  const centerY = component.y + component.length / 2;

  let points: Pair[];

  if (component.shape === "rectangle") {
    points = [
      [component.x, component.y],
      [component.x + component.width, component.y],
      [component.x + component.width, component.y + component.length],
      [component.x, component.y + component.length],
    ];
  } else if (component.shape === "right-triangle") {
    points = [
      [component.x, component.y + component.length],
      [component.x + component.width, component.y + component.length],
      [component.x, component.y],
    ];
  } else {
    const segments = 64;

    points = Array.from({ length: segments }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2;

      return [
        centerX + (component.width / 2) * Math.cos(angle),
        centerY + (component.length / 2) * Math.sin(angle),
      ];
    });
  }

  const rotation = ((component.rotation % 360) + 360) % 360;
  let cosine: number;
  let sine: number;

  switch (rotation) {
    case 0:
      cosine = 1;
      sine = 0;
      break;
    case 90:
      cosine = 0;
      sine = 1;
      break;
    case 180:
      cosine = -1;
      sine = 0;
      break;
    case 270:
      cosine = 0;
      sine = -1;
      break;
    default: {
      const radians = (rotation * Math.PI) / 180;
      cosine = Math.cos(radians);
      sine = Math.sin(radians);
    }
  }
  const horizontalDirection = component.mirrorVertical ? -1 : 1;
  const verticalDirection = component.mirrorHorizontal ? -1 : 1;

  return points.map(([x, y]) => [
    centerX +
      (x - centerX) * horizontalDirection * cosine -
      (y - centerY) * verticalDirection * sine,
    centerY +
      (x - centerX) * horizontalDirection * sine +
      (y - centerY) * verticalDirection * cosine,
  ]);
}

export function getComponentBounds(
  component: RoomComponent,
): ComponentBounds {
  const points = getComponentRing(component);

  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

export function getComponentsBounds(
  components: RoomComponent[],
): ComponentBounds | null {
  if (components.length === 0) {
    return null;
  }

  const bounds = components.map(getComponentBounds);

  return {
    minX: Math.min(...bounds.map(({ minX }) => minX)),
    minY: Math.min(...bounds.map(({ minY }) => minY)),
    maxX: Math.max(...bounds.map(({ maxX }) => maxX)),
    maxY: Math.max(...bounds.map(({ maxY }) => maxY)),
  };
}

export function getFurnitureTemplateComponents(
  template: FurnitureTemplate,
): RoomComponent[] {
  return (
    template.components ?? [
      {
        id: "legacy-template-shape",
        shape: template.shape,
        x: 0,
        y: 0,
        width: template.width,
        length: template.length,
        rotation: 0,
      },
    ]
  );
}

export function getFurnitureTemplateOutline(
  template: FurnitureTemplate,
): MultiPolygon {
  return getComponentsOutline(getFurnitureTemplateComponents(template), [0, 0]);
}

function isPointInRing(point: Pair, ring: Pair[]): boolean {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index]!;
    const [previousX, previousY] = ring[previous]!;
    const crossesRay =
      y > point[1] !== previousY > point[1] &&
      point[0] <
        ((previousX - x) * (point[1] - y)) / (previousY - y) + x;

    if (crossesRay) {
      inside = !inside;
    }
  }

  return inside;
}

function getPointToSegmentDistance(point: Pair, start: Pair, end: Pair): number {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point[0] - start[0]) * deltaX +
              (point[1] - start[1]) * deltaY) /
              lengthSquared,
          ),
        );
  const closestX = start[0] + projection * deltaX;
  const closestY = start[1] + projection * deltaY;

  return Math.hypot(point[0] - closestX, point[1] - closestY);
}

function getPolygonClearance(point: Pair, polygon: MultiPolygon[number]): number {
  const inside = polygon
    .map((ring) => isPointInRing(point, ring))
    .reduce((isInside, ringContainsPoint) => isInside !== ringContainsPoint, false);

  if (!inside) {
    return -Infinity;
  }

  return Math.min(
    ...polygon.flatMap((ring) =>
      ring.map((start, index) =>
        getPointToSegmentDistance(
          point,
          start,
          ring[(index + 1) % ring.length]!,
        ),
      ),
    ),
  );
}

function getPolygonLabelCenter(
  polygon: MultiPolygon[number],
): { point: Pair; clearance: number } | null {
  const exterior = polygon[0];

  if (!exterior?.length) {
    return null;
  }

  const minX = Math.min(...exterior.map(([x]) => x));
  const minY = Math.min(...exterior.map(([, y]) => y));
  const maxX = Math.max(...exterior.map(([x]) => x));
  const maxY = Math.max(...exterior.map(([, y]) => y));
  const initialStep = Math.min(maxX - minX, maxY - minY) / 20;

  if (initialStep <= 0) {
    return null;
  }

  let bestPoint: Pair | null = null;
  let bestClearance = -Infinity;
  let bestCenterDistance = Infinity;
  const boundsCenter: Pair = [(minX + maxX) / 2, (minY + maxY) / 2];

  function considerPoint(point: Pair) {
    const clearance = getPolygonClearance(point, polygon);
    const centerDistance = Math.hypot(
      point[0] - boundsCenter[0],
      point[1] - boundsCenter[1],
    );

    if (
      clearance > bestClearance + 1e-9 ||
      (Math.abs(clearance - bestClearance) <= 1e-9 &&
        centerDistance < bestCenterDistance)
    ) {
      bestPoint = point;
      bestClearance = clearance;
      bestCenterDistance = centerDistance;
    }
  }

  for (let xIndex = 0; xIndex <= 20; xIndex += 1) {
    for (let yIndex = 0; yIndex <= 20; yIndex += 1) {
      const point: Pair = [
        minX + ((maxX - minX) * xIndex) / 20,
        minY + ((maxY - minY) * yIndex) / 20,
      ];
      considerPoint(point);
    }
  }

  if (!bestPoint) {
    return null;
  }

  let step = initialStep / 2;

  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (let xOffset = -2; xOffset <= 2; xOffset += 1) {
      for (let yOffset = -2; yOffset <= 2; yOffset += 1) {
        const point: Pair = [
          bestPoint[0] + xOffset * step,
          bestPoint[1] + yOffset * step,
        ];
        considerPoint(point);
      }
    }

    step /= 2;
  }

  return { point: bestPoint, clearance: bestClearance };
}

export function getFurnitureTemplateLabelPlacement(
  template: FurnitureTemplate,
): { center: Pair; clearance: number } {
  const components = getFurnitureTemplateComponents(template);
  const outline = getComponentsOutline(components, [0, 0]);
  const placement = outline
    .map(getPolygonLabelCenter)
    .filter(
      (candidate): candidate is { point: Pair; clearance: number } =>
        candidate !== null,
    )
    .sort((first, second) => second.clearance - first.clearance)[0];

  if (placement) {
    return { center: placement.point, clearance: placement.clearance };
  }

  const bounds = getComponentsBounds(components);

  if (!bounds) {
    return {
      center: [template.width / 2, template.length / 2],
      clearance: 0,
    };
  }

  return {
    center: [
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
    ],
    clearance: 0,
  };
}

export function getFurnitureTemplateLabelCenter(template: FurnitureTemplate): Pair {
  return getFurnitureTemplateLabelPlacement(template).center;
}

function getComponentsOutline(
  components: RoomComponent[],
  offset: Pair,
): MultiPolygon {
  // Avoid near-coincident intersections from pointer-derived fractional coordinates.
  const polygons = components.map((component) => [
    getComponentRing(component).map(([x, y]) => [
      Math.round((x + offset[0]) * POLYGON_COORDINATE_SCALE) /
        POLYGON_COORDINATE_SCALE,
      Math.round((y + offset[1]) * POLYGON_COORDINATE_SCALE) /
        POLYGON_COORDINATE_SCALE,
    ] as Pair),
  ]);
  const [firstPolygon, ...remainingPolygons] = polygons;

  return firstPolygon
    ? polygonClipping.union(firstPolygon, ...remainingPolygons)
    : [];
}

export function getRoomOutline(room: Room): MultiPolygon {
  return getComponentsOutline(getRoomComponents(room), [room.x, room.y]);
}

function getMultiPolygonArea(multiPolygon: MultiPolygon): number {
  return multiPolygon.reduce(
    (totalArea, polygon) =>
      totalArea +
      polygon.reduce((polygonArea, ring, ringIndex) => {
        const twiceArea = ring.reduce((sum, point, index) => {
          const next = ring[(index + 1) % ring.length];

          return next
            ? sum + point[0] * next[1] - next[0] * point[1]
            : sum;
        }, 0);
        const ringArea = Math.abs(twiceArea) / 2;

        return polygonArea + (ringIndex === 0 ? ringArea : -ringArea);
      }, 0),
    0,
  );
}

export function getComponentsArea(components: RoomComponent[]): number {
  return getMultiPolygonArea(getComponentsOutline(components, [0, 0]));
}

export function getRoomArea(room: Room): number {
  return getMultiPolygonArea(getRoomOutline(room));
}

export function getRoomBoundaryEdges(room: Room): RoomBoundaryEdge[] {
  const outline = getRoomOutline(room);

  return outline.flatMap((polygon, polygonIndex) =>
    polygon.flatMap((ring, ringIndex) => {
      const isClosed =
        ring.length > 1 &&
        ring[0][0] === ring[ring.length - 1][0] &&
        ring[0][1] === ring[ring.length - 1][1];
      const points = isClosed ? ring.slice(0, -1) : ring;

      return points.flatMap((start, edgeIndex) => {
        const end = points[(edgeIndex + 1) % points.length];

        if (!end) {
          return [];
        }

        const length = Math.hypot(end[0] - start[0], end[1] - start[1]);

        if (length < 0.001) {
          return [];
        }

        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const outwardNormal: Pair = [dy / length, -dx / length];

        return [{
          id: `${room.id}-${polygonIndex}-${ringIndex}-${edgeIndex}`,
          roomId: room.id,
          start,
          end,
          length,
          outwardNormal,
        }];
      });
    }),
  );
}

export function getRoomEdgeSide(
  room: Room,
  edge: RoomBoundaryEdge,
): "top" | "right" | "bottom" | "left" | undefined {
  const epsilon = 0.01;

  if (
    Math.abs(edge.start[1] - room.y) < epsilon &&
    Math.abs(edge.end[1] - room.y) < epsilon
  ) {
    return "top";
  }

  if (
    Math.abs(edge.start[0] - (room.x + room.width)) < epsilon &&
    Math.abs(edge.end[0] - (room.x + room.width)) < epsilon
  ) {
    return "right";
  }

  if (
    Math.abs(edge.start[1] - (room.y + room.length)) < epsilon &&
    Math.abs(edge.end[1] - (room.y + room.length)) < epsilon
  ) {
    return "bottom";
  }

  if (
    Math.abs(edge.start[0] - room.x) < epsilon &&
    Math.abs(edge.end[0] - room.x) < epsilon
  ) {
    return "left";
  }
}

function pointToSegmentDistance(point: Pair, start: Pair, end: Pair): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }

  const ratio = Math.min(
    1,
    Math.max(
      0,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        lengthSquared,
    ),
  );

  return Math.hypot(
    point[0] - (start[0] + ratio * dx),
    point[1] - (start[1] + ratio * dy),
  );
}

function isCircularApproximationEdge(
  edge: RoomBoundaryEdge,
  room: Room,
): boolean {
  return room.components
    .filter((component) => component.shape === "circle")
    .some((component) => {
      const ring = getComponentRing(component).map(
        ([x, y]): Pair => [x + room.x, y + room.y],
      );

      return ring.some((start, index) => {
        const next = ring[(index + 1) % ring.length];

        if (!next) {
          return false;
        }

        const edgeMidpoint: Pair = [
          (edge.start[0] + edge.end[0]) / 2,
          (edge.start[1] + edge.end[1]) / 2,
        ];

        return (
          pointToSegmentDistance(edge.start, start, next) < 0.01 &&
          pointToSegmentDistance(edge.end, start, next) < 0.01 &&
          pointToSegmentDistance(edgeMidpoint, start, next) < 0.01
        );
      });
    });
}

export function getStraightRoomBoundaryEdges(room: Room): RoomBoundaryEdge[] {
  return getRoomBoundaryEdges(room).filter(
    (edge) => !isCircularApproximationEdge(edge, room),
  );
}

export function migrateLegacyWallOpenings(
  rooms: Room[],
  openings: WallOpening[],
): WallOpening[] {
  return openings.map((opening) => {
    const match = /^(\d+)-(top|right|bottom|left)$/.exec(opening.sourceId);

    if (!match) {
      return opening;
    }

    const room = rooms.find((item) => item.id === Number(match[1]));
    const side = match[2];

    if (!room) {
      return opening;
    }

    const edges = getStraightRoomBoundaryEdges(room);
    let edge = edges
      .filter((candidate) => getRoomEdgeSide(room, candidate) === side)
      .sort((first, second) => second.length - first.length)[0];
    const matchedSide = edge !== undefined;
    let offset = opening.offset;

    if (!edge) {
      const centerOffset = opening.offset + opening.width / 2;
      const target: Pair =
        side === "top"
          ? [room.x + centerOffset, room.y]
          : side === "bottom"
            ? [room.x + centerOffset, room.y + room.length]
            : side === "left"
              ? [room.x, room.y + centerOffset]
              : [room.x + room.width, room.y + centerOffset];
      const nearest = edges
        .map((candidate) => {
          const dx = candidate.end[0] - candidate.start[0];
          const dy = candidate.end[1] - candidate.start[1];
          const ratio = Math.min(
            1,
            Math.max(
              0,
              ((target[0] - candidate.start[0]) * dx +
                (target[1] - candidate.start[1]) * dy) /
                (candidate.length * candidate.length),
            ),
          );
          const point: Pair = [
            candidate.start[0] + ratio * dx,
            candidate.start[1] + ratio * dy,
          ];

          return {
            edge: candidate,
            ratio,
            distance: Math.hypot(target[0] - point[0], target[1] - point[1]),
          };
        })
        .sort((first, second) => first.distance - second.distance)[0];

      if (!nearest) {
        return opening;
      }

      edge = nearest.edge;
      offset = nearest.ratio * edge.length - opening.width / 2;
    }

    if (matchedSide) {
      const isHorizontal = side === "top" || side === "bottom";
      const isReversed = isHorizontal
        ? edge.end[0] < edge.start[0]
        : edge.end[1] < edge.start[1];

      if (isReversed) {
        offset = edge.length - opening.offset - opening.width;
      }
    }

    const width = Math.min(opening.width, edge.length);

    return {
      ...opening,
      sourceId: edge.id,
      width,
      offset: Math.min(Math.max(offset, 0), edge.length - width),
    };
  });
}

export function getRoomWallBounds(
  room: Room,
  defaultThickness: number,
  thicknesses: Record<string, number>,
): PlanBounds {
  const edges = getRoomBoundaryEdges(room);
  const points = edges.flatMap((edge) => {
    const side = getRoomEdgeSide(room, edge);
    const thickness =
      thicknesses[edge.id] ??
      (side ? thicknesses[`${room.id}-${side}`] : undefined) ??
      defaultThickness;
    const padding = Math.max(thickness, 0);

    return [
      [edge.start[0] - padding, edge.start[1] - padding],
      [edge.start[0] + padding, edge.start[1] + padding],
      [edge.end[0] - padding, edge.end[1] - padding],
      [edge.end[0] + padding, edge.end[1] + padding],
    ] as Pair[];
  });

  if (points.length === 0) {
    return {
      minX: room.x,
      minY: room.y,
      maxX: room.x + room.width,
      maxY: room.y + room.length,
      width: room.width,
      height: room.length,
    };
  }

  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getComponentWalls(
  room: Room,
  defaultThickness: number,
  thicknesses: Record<string, number>,
): ComponentWall[] {
  return getRoomBoundaryEdges(room).map((edge) => {
    const side = getRoomEdgeSide(room, edge);
    const sourceId = side ? `${room.id}-${side}` : edge.id;
    const thickness =
      thicknesses[edge.id] ?? thicknesses[sourceId] ?? defaultThickness;

    return {
      id: edge.id,
      roomId: room.id,
      sourceId,
      start: edge.start,
      end: edge.end,
      outwardNormal: edge.outwardNormal,
      length: edge.length,
      thickness,
    };
  });
}

export function getCanonicalWallSegments(
  rooms: Room[],
  defaultThickness: number,
  thicknesses: Record<string, number>,
): WallSegment[] {
  const walls = rooms.flatMap((room) =>
    getComponentWalls(room, defaultThickness, thicknesses),
  );
  const cuts = walls.map(() => new Set([0, 1]));
  const tolerance = 0.01;

  for (let firstIndex = 0; firstIndex < walls.length; firstIndex += 1) {
    const first = walls[firstIndex];

    if (!first) {
      continue;
    }

    const firstDx = first.end[0] - first.start[0];
    const firstDy = first.end[1] - first.start[1];
    const firstLength = first.length;

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < walls.length;
      secondIndex += 1
    ) {
      const second = walls[secondIndex];

      if (
        !second ||
        Math.abs(first.thickness - second.thickness) > tolerance ||
        first.outwardNormal[0] * second.outwardNormal[0] +
        first.outwardNormal[1] * second.outwardNormal[1] >
        -0.999
      ) {
        continue;
      }

      const secondDx = second.end[0] - second.start[0];
      const secondDy = second.end[1] - second.start[1];
      const directionCross =
        (firstDx * secondDy - firstDy * secondDx) /
        (firstLength * second.length);
      const lineDistance =
        Math.abs(
          firstDx * (second.start[1] - first.start[1]) -
          firstDy * (second.start[0] - first.start[0]),
        ) / firstLength;

      if (Math.abs(directionCross) > 0.001 || lineDistance > tolerance) {
        continue;
      }

      const firstCuts = cuts[firstIndex];
      const secondCuts = cuts[secondIndex];

      if (!firstCuts || !secondCuts) {
        continue;
      }

      const firstStart = first.start;
      const secondStart = second.start;
      const firstLengthSquared = firstDx * firstDx + firstDy * firstDy;
      const secondLengthSquared =
        secondDx * secondDx + secondDy * secondDy;

      const secondOnFirst = [
        ((second.start[0] - firstStart[0]) * firstDx +
          (second.start[1] - firstStart[1]) * firstDy) /
        firstLengthSquared,
        ((second.end[0] - firstStart[0]) * firstDx +
          (second.end[1] - firstStart[1]) * firstDy) /
        firstLengthSquared,
      ];
      const firstOnSecond = [
        ((first.start[0] - secondStart[0]) * secondDx +
          (first.start[1] - secondStart[1]) * secondDy) /
        secondLengthSquared,
        ((first.end[0] - secondStart[0]) * secondDx +
          (first.end[1] - secondStart[1]) * secondDy) /
        secondLengthSquared,
      ];

      const addOverlapCuts = (
        values: number[],
        targetCuts: Set<number>,
      ) => {
        const low = Math.max(0, Math.min(...values));
        const high = Math.min(1, Math.max(...values));

        if (high - low <= tolerance / Math.max(firstLength, second.length)) {
          return;
        }

        targetCuts.add(low);
        targetCuts.add(high);
      };

      addOverlapCuts(secondOnFirst, firstCuts);
      addOverlapCuts(firstOnSecond, secondCuts);
    }
  }

  const segments = new Map<string, WallSegment>();

  walls.forEach((wall, wallIndex) => {
    const wallCuts = [...(cuts[wallIndex] ?? [])].sort((a, b) => a - b);

    for (let index = 0; index < wallCuts.length - 1; index += 1) {
      const startRatio = wallCuts[index];
      const endRatio = wallCuts[index + 1];

      if (startRatio === undefined || endRatio === undefined) {
        continue;
      }

      const interpolate = (ratio: number): Pair => [
        wall.start[0] + (wall.end[0] - wall.start[0]) * ratio,
        wall.start[1] + (wall.end[1] - wall.start[1]) * ratio,
      ];

      const start = interpolate(startRatio);
      const end = interpolate(endRatio);
      const ordered = [start, end].sort((a, b) =>
        a[0] === b[0] ? a[1] - b[1] : a[0] - b[0],
      );
      const key = [
        ...ordered.flatMap(([x, y]) => [
          Math.round(x / tolerance),
          Math.round(y / tolerance),
        ]),
        Math.round(wall.thickness / tolerance),
      ].join(":");
      const existing = segments.get(key);
      const source = {
        roomId: wall.roomId,
        sourceId: wall.sourceId,
        outwardNormal: wall.outwardNormal,
      };

      if (existing) {
        if (
          !existing.sources.some(
            (item) =>
              item.roomId === source.roomId &&
              item.sourceId === source.sourceId,
          )
        ) {
          existing.sources.push(source);
        }

        continue;
      }

      segments.set(key, {
        id: key,
        start,
        end,
        outwardNormal: wall.outwardNormal,
        length: wall.length * (endRatio - startRatio),
        thickness: wall.thickness,
        sources: [source],
      });
    }
  });

  return [...segments.values()].map((segment) => ({
    ...segment,
    id: [
      segment.sources
        .map((source) => `${source.roomId}:${source.sourceId}`)
        .sort()
        .join(","),
      ...[...segment.start, ...segment.end].map((value) =>
        Math.round(value / tolerance),
      ),
    ].join("|"),
  }));
}

export function getRoomBoundaryBounds(room: Room): PlanBounds {
  const points = getRoomBoundaryEdges(room).flatMap((edge) => [
    edge.start,
    edge.end,
  ]);

  if (points.length === 0) {
    return {
      minX: room.x,
      minY: room.y,
      maxX: room.x + room.width,
      maxY: room.y + room.length,
      width: room.width,
      height: room.length,
    };
  }

  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getAdjacentRoomIds(
  room: Room,
  rooms: Room[],
  defaultThickness: number,
  thicknesses: Record<string, number>,
): number[] {
  const thickness = (side: string) =>
    thicknesses[`${room.id}-${side}`] ?? defaultThickness;

  const adjacentIds: number[] = [];

  for (const other of rooms) {
    if (other.id === room.id) {
      continue;
    }

    const otherThickness = (side: string) =>
      thicknesses[`${other.id}-${side}`] ?? defaultThickness;

    const verticalOverlap =
      Math.min(room.y + room.length, other.y + other.length) >
      Math.max(room.y, other.y);

    const horizontalOverlap =
      Math.min(room.x + room.width, other.x + other.width) >
      Math.max(room.x, other.x);

    const sharesVerticalWall =
      verticalOverlap &&
      ((Math.abs(
        other.x - (room.x + room.width) - thickness("right"),
      ) < 0.01 &&
        Math.abs(thickness("right") - otherThickness("left")) < 0.01) ||
        (Math.abs(
          room.x - (other.x + other.width) - thickness("left"),
        ) < 0.01 &&
          Math.abs(thickness("left") - otherThickness("right")) < 0.01));

    const sharesHorizontalWall =
      horizontalOverlap &&
      ((Math.abs(
        other.y - (room.y + room.length) - thickness("bottom"),
      ) < 0.01 &&
        Math.abs(thickness("bottom") - otherThickness("top")) < 0.01) ||
        (Math.abs(
          room.y - (other.y + other.length) - thickness("top"),
        ) < 0.01 &&
          Math.abs(thickness("top") - otherThickness("bottom")) < 0.01));

    if (sharesVerticalWall || sharesHorizontalWall) {
      adjacentIds.push(other.id);
    }
  }

  return adjacentIds;
}
