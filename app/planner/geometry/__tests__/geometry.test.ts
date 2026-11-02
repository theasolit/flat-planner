import { describe, expect, it } from "vitest";
import {
  getComponentBounds,
  getComponentRing,
  getComponentsArea,
  getComponentsBounds,
  getFurnitureTemplateLabelCenter,
  getFurnitureTemplateOutline,
  getRoomArea,
  getRoomBoundaryEdges,
  getStraightRoomBoundaryEdges,
  migrateLegacyWallOpenings,
} from "../geometry";
import { snapRoomPosition } from "../roomSnapping";
import type {
  FurnitureTemplate,
  Room,
  RoomComponent,
  WallOpening,
} from "../../types";

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
  it("uses only the combined outer boundary for multi-component furniture", () => {
    const template: FurnitureTemplate = {
      id: "joined-furniture",
      name: "Joined furniture",
      shape: "rectangle",
      width: 50,
      length: 20,
      components: [
        {
          id: "left",
          shape: "rectangle",
          x: 0,
          y: 0,
          width: 30,
          length: 20,
          rotation: 0,
        },
        {
          id: "right",
          shape: "rectangle",
          x: 20,
          y: 0,
          width: 30,
          length: 20,
          rotation: 0,
        },
      ],
    };
    const outline = getFurnitureTemplateOutline(template);
    const rings = outline.flatMap((polygon) => polygon);
    const edges = rings.flatMap((ring) =>
      ring.map((point, index) => [point, ring[(index + 1) % ring.length]]),
    );

    expect(outline).toHaveLength(1);
    expect(
      edges.some(
        ([start, end]) =>
          start?.[0] === 20 &&
          end?.[0] === 20 &&
          start?.[1] !== end?.[1],
      ),
    ).toBe(false);
  });

  it("mirrors triangle components across either axis about their center", () => {
    const component: RoomComponent = {
      id: "triangle",
      shape: "right-triangle",
      x: 10,
      y: 20,
      width: 40,
      length: 20,
      rotation: 0,
    };

    expect(getComponentRing({ ...component, mirrorHorizontal: true })).toEqual(
      [
        [10, 20],
        [50, 20],
        [10, 40],
      ],
    );
    expect(getComponentRing({ ...component, mirrorVertical: true })).toEqual(
      [
        [50, 40],
        [10, 40],
        [50, 20],
      ],
    );
    expect(
      getComponentRing({
        ...component,
        mirrorHorizontal: true,
        mirrorVertical: true,
      }),
    ).toEqual([
      [50, 20],
      [10, 20],
      [50, 40],
    ]);
    expect(
      getComponentRing({
        ...component,
        rotation: 90,
        mirrorHorizontal: true,
      }),
    ).toEqual([
      [40, 10],
      [40, 50],
      [20, 10],
    ]);
  });

  it("unions mirrored, quarter-turned triangles without floating-point seams", () => {
    const components: RoomComponent[] = [
      {
        id: "narrow",
        shape: "right-triangle",
        x: 300,
        y: 0,
        width: 25,
        length: 50,
        rotation: 180,
        mirrorHorizontal: true,
      },
      {
        id: "wide",
        shape: "right-triangle",
        x: 300,
        y: 0,
        width: 175,
        length: 50,
        rotation: 180,
        mirrorVertical: true,
      },
    ];

    expect(getComponentsArea(components)).toBeCloseTo(4464.285714285714);
  });

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

  it("places a furniture label inside the triangle between its nearest edges", () => {
    const template: FurnitureTemplate = {
      id: "offset-template",
      name: "Offset template",
      shape: "right-triangle",
      width: 100,
      length: 80,
      components: [
        {
          id: "offset-triangle",
          shape: "right-triangle",
          x: 20,
          y: 10,
          width: 40,
          length: 20,
          rotation: 0,
        },
      ],
    };

    const [x, y] = getFurnitureTemplateLabelCenter(template);
    const distances = [
      x - 20,
      30 - y,
      Math.abs(x - 2 * y) / Math.sqrt(5),
    ];

    expect(x).toBeGreaterThan(20);
    expect(x).toBeLessThan(60);
    expect(y).toBeGreaterThan(10);
    expect(y).toBeLessThan(30);
    expect(Math.abs(distances[0]! - distances[1]!)).toBeLessThan(0.1);
    expect(Math.abs(distances[1]! - distances[2]!)).toBeLessThan(0.1);
  });

  it("limits a rectangle label to the dimensions of its painted shape", () => {
    const template: FurnitureTemplate = {
      id: "rectangle-template",
      name: "A long furniture name",
      shape: "rectangle",
      width: 100,
      length: 60,
      components: [
        {
          id: "rectangle",
          shape: "rectangle",
          x: 0,
          y: 0,
          width: 100,
          length: 60,
          rotation: 0,
        },
      ],
    };

    expect(getFurnitureTemplateLabelCenter(template)).toEqual([50, 30]);
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

  it("unions overlapping circular and triangular components at fractional positions", () => {
    const room = {
      ...makeRoom([
        {
          id: "triangle",
          shape: "right-triangle" as const,
          x: 923.3607097204508,
          y: 2.2147065713634673,
          width: 400,
          length: 150,
          rotation: 180,
        },
        {
          id: "circle",
          shape: "circle" as const,
          x: 923.3607097204508,
          y: -147.78529342863652,
          width: 300,
          length: 300,
          rotation: 270,
        },
      ]),
      x: 1676.8504601657362,
      y: 122.62731092820631,
    };

    expect(getRoomBoundaryEdges(room).length).toBeGreaterThan(0);
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
