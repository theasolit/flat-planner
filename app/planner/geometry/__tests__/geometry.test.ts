import { describe, expect, it } from "vitest";
import {
  getComponentBounds,
  getComponentsBounds,
  getRoomArea,
  getRoomBoundaryEdges,
  getStraightRoomBoundaryEdges,
  migrateLegacyWallOpenings,
} from "../geometry";
import { snapRoomPosition } from "../roomSnapping";
import type { Room, RoomComponent, WallOpening } from "../../types";

function makeRoom(components: RoomComponent[]): Room {
  return {
    id: 4,
    name: "Test room",
    width: 800,
    length: 300,
    x: 40,
    y: 20,
    components,
  };
}

describe("room geometry", () => {
  it("calculates component and composed shape bounds", () => {
    const components: RoomComponent[] = [
      {
        id: "base",
        shape: "rectangle",
        x: 10,
        y: 20,
        width: 30,
        length: 10,
        rotation: 0,
      },
      {
        id: "extension",
        shape: "rectangle",
        x: 40,
        y: 10,
        width: 15,
        length: 20,
        rotation: 0,
      },
    ];

    expect(getComponentBounds(components[0]!)).toEqual({
      minX: 10,
      minY: 20,
      maxX: 40,
      maxY: 30,
    });
    expect(getComponentsBounds(components)).toEqual({
      minX: 10,
      minY: 10,
      maxX: 55,
      maxY: 30,
    });
    expect(getComponentsBounds([])).toBeNull();
  });

  it("snaps adjacent rooms with the configured wall thickness between them", () => {
    const otherRoom = {
      ...makeRoom([
        {
          id: "other",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 400,
          length: 300,
          rotation: 0,
        },
      ]),
      width: 400,
      length: 300,
    };
    const draggedRoom = {
      ...makeRoom([
        {
          id: "dragged",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 300,
          length: 200,
          rotation: 0,
        },
      ]),
      id: 9,
      width: 300,
      length: 200,
    };

    expect(
      snapRoomPosition(draggedRoom, 435, 50, 10, [otherRoom]),
    ).toEqual({ x: 450, y: 50 });
  });

  it("uses the dragged room's custom wall thickness when snapping", () => {
    const otherRoom = {
      ...makeRoom([
        {
          id: "other",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 400,
          length: 300,
          rotation: 0,
        },
      ]),
      id: 4,
      width: 400,
      length: 300,
    };
    const draggedRoom = {
      ...makeRoom([
        {
          id: "dragged",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 300,
          length: 200,
          rotation: 0,
        },
      ]),
      id: 9,
      width: 300,
      length: 200,
    };

    expect(
      snapRoomPosition(draggedRoom, 445, 50, 10, [otherRoom], {
        "9-left": 20,
      }),
    ).toEqual({ x: 460, y: 50 });
  });

  it("snaps top and bottom walls together when rooms' left sides are aligned", () => {
    const upperRoom = {
      ...makeRoom([
        {
          id: "upper",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 400,
          length: 300,
          rotation: 0,
        },
      ]),
      id: 4,
      x: 100,
      y: 100,
      width: 400,
      length: 300,
    };
    const lowerRoom = {
      ...makeRoom([
        {
          id: "lower",
          shape: "rectangle" as const,
          x: 0,
          y: 0,
          width: 400,
          length: 200,
          rotation: 0,
        },
      ]),
      id: 9,
      x: 100,
      y: 405,
      width: 400,
      length: 200,
    };

    expect(
      snapRoomPosition(lowerRoom, lowerRoom.x, lowerRoom.y, 10, [upperRoom]),
    ).toEqual({ x: 100, y: 410 });
  });

  it("calculates rectangle area from its outline", () => {
    const room = makeRoom([
      {
        id: "rectangle",
        shape: "rectangle",
        x: 0,
        y: 0,
        width: 400,
        length: 300,
        rotation: 0,
      },
    ]);

    expect(getRoomArea(room)).toBe(120_000);
  });

  it("calculates the union area of attached components", () => {
    const room = makeRoom([
      {
        id: "rectangle",
        shape: "rectangle",
        x: 0,
        y: 0,
        width: 400,
        length: 300,
        rotation: 0,
      },
      {
        id: "triangle",
        shape: "right-triangle",
        x: 400,
        y: 0,
        width: 400,
        length: 300,
        rotation: 0,
      },
    ]);

    expect(getRoomArea(room)).toBe(180_000);
    expect(getRoomBoundaryEdges(room)).toHaveLength(4);
  });

  it("excludes approximated circle arcs but preserves straight boundaries", () => {
    const room = makeRoom([
      {
        id: "circle",
        shape: "circle",
        x: 0,
        y: 0,
        width: 300,
        length: 300,
        rotation: 0,
      },
    ]);

    expect(getRoomBoundaryEdges(room)).toHaveLength(64);
    expect(getStraightRoomBoundaryEdges(room)).toHaveLength(0);
  });

  it("migrates a legacy side opening to its rectangle edge", () => {
    const room = makeRoom([
      {
        id: "rectangle",
        shape: "rectangle",
        x: 0,
        y: 0,
        width: 400,
        length: 300,
        rotation: 0,
      },
    ]);
    const opening: WallOpening = {
      id: "door",
      sourceId: "4-top",
      offset: 50,
      width: 90,
      kind: "door",
    };
    const [migrated] = migrateLegacyWallOpenings([room], [opening]);

    expect(migrated?.sourceId).toBe(getStraightRoomBoundaryEdges(room)[0]?.id);
    expect(migrated?.offset).toBe(50);
    expect(migrated?.width).toBe(90);
  });

  it("maps a missing legacy side to the nearest straight edge", () => {
    const room = makeRoom([
      {
        id: "triangle",
        shape: "right-triangle",
        x: 0,
        y: 0,
        width: 400,
        length: 300,
        rotation: 0,
      },
    ]);
    const opening: WallOpening = {
      id: "door",
      sourceId: "4-top",
      offset: 100,
      width: 80,
      kind: "door",
    };
    const [migrated] = migrateLegacyWallOpenings([room], [opening]);
    const edge = getStraightRoomBoundaryEdges(room).find(
      (candidate) => candidate.id === migrated?.sourceId,
    );

    expect(edge).toBeDefined();
    expect(migrated?.offset).toBeGreaterThanOrEqual(0);
    expect((migrated?.offset ?? 0) + (migrated?.width ?? 0)).toBeLessThanOrEqual(
      edge?.length ?? 0,
    );
  });
});
