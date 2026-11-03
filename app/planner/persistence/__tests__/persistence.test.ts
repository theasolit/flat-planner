import { describe, expect, it } from "vitest";
import {
  parseFlatData,
  serializeFlatData,
} from "../persistence";
import type { Flat } from "../../types";

const validFlat: Flat = {
  rooms: [
    {
      id: 1,
      name: "Living room",
      width: 400,
      length: 300,
      x: 40,
      y: 40,
      components: [
        {
          id: "rectangle",
          shape: "rectangle",
          x: 0,
          y: 0,
          width: 400,
          length: 300,
          rotation: 0,
        },
      ],
    },
  ],
  selectedRoomId: 1,
  wallThickness: 10,
  wallThicknesses: {},
  wallOpenings: [],
  furnitureTemplates: [],
  furniturePlacements: [],
};

describe("flat import validation", () => {
  it("serializes flat data for storage and export", () => {
    expect(parseFlatData(serializeFlatData(validFlat))).toEqual(validFlat);
    expect(parseFlatData(serializeFlatData(validFlat, true))).toEqual(
      validFlat,
    );
  });

  it("parses a complete flat export", () => {
    expect(parseFlatData(JSON.stringify(validFlat))).toEqual(validFlat);
  });

  it("round-trips furniture room and category assignments", () => {
    const categorizedFlat: Flat = {
      ...validFlat,
      furnitureCategories: [{ id: "work", name: "Work" }],
      furnitureTemplates: [
        {
          id: "desk",
          name: "Desk",
          shape: "rectangle",
          width: 120,
          length: 60,
          roomIds: [1],
          categoryIds: ["work"],
        },
      ],
    };

    expect(
      parseFlatData(serializeFlatData(categorizedFlat)),
    ).toEqual(categorizedFlat);
  });

  it("rejects furniture assignments to missing rooms or categories", () => {
    const template = {
      id: "desk",
      name: "Desk",
      shape: "rectangle",
      width: 120,
      length: 60,
    };

    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furnitureTemplates: [{ ...template, roomIds: [2] }],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");

    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furnitureTemplates: [{ ...template, categoryIds: ["missing"] }],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");
  });

  it("rejects duplicate managed furniture categories", () => {
    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furnitureCategories: [
            { id: "work", name: "Work" },
            { id: "work", name: "Office" },
          ],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");

    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furnitureCategories: [
            { id: "work", name: "Work" },
            { id: "office", name: " work " },
          ],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");
  });

  it("accepts quarter-circle room components and furniture templates", () => {
    const flat: Flat = {
      ...validFlat,
      rooms: [
        {
          ...validFlat.rooms[0]!,
          components: [
            {
              id: "quarter-circle-room",
              shape: "quarter-circle",
              x: 0,
              y: 0,
              width: 300,
              length: 300,
              rotation: 0,
            },
          ],
        },
      ],
      furnitureTemplates: [
        {
          id: "quarter-circle-template",
          name: "Quarter circle",
          shape: "quarter-circle",
          width: 100,
          length: 100,
          components: [
            {
              id: "quarter-circle-furniture",
              shape: "quarter-circle",
              x: 0,
              y: 0,
              width: 100,
              length: 100,
              rotation: 0,
            },
          ],
        },
      ],
    };

    expect(parseFlatData(serializeFlatData(flat))).toEqual(flat);
  });

  it("preserves circle sector included angles", () => {
    const flat: Flat = {
      ...validFlat,
      rooms: [
        {
          ...validFlat.rooms[0]!,
          components: [
            {
              id: "sector-room",
              shape: "circle",
              x: 0,
              y: 0,
              width: 300,
              length: 300,
              includedAngle: 135,
              rotation: 0,
            },
          ],
        },
      ],
    };

    expect(parseFlatData(serializeFlatData(flat))).toEqual(flat);
  });

  it("accepts older flat saves without optional collections", () => {
    const legacyFlat = {
      rooms: validFlat.rooms,
      selectedRoomId: validFlat.selectedRoomId,
    };

    expect(parseFlatData(JSON.stringify(legacyFlat)).rooms).toEqual(
      validFlat.rooms,
    );
  });

  it("preserves flat and furniture lock states and defaults older data to unlocked", () => {
    const lockedFlat: Flat = {
      ...validFlat,
      isFlatLocked: true,
      furnitureTemplates: [
        {
          id: "sofa-template",
          name: "Sofa",
          shape: "rectangle",
          width: 100,
          length: 60,
        },
      ],
      furniturePlacements: [
        {
          id: "sofa-placement",
          templateId: "sofa-template",
          roomId: 1,
          locked: true,
          x: 90,
          y: 80,
          rotation: 0,
        },
      ],
    };

    expect(parseFlatData(serializeFlatData(lockedFlat))).toEqual(lockedFlat);
    expect(
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furniturePlacements: [
            {
              id: "sofa-placement",
              templateId: "sofa-template",
              roomId: 1,
              x: 90,
              y: 80,
              rotation: 0,
            },
          ],
        }),
      ).furniturePlacements?.[0]?.locked,
    ).toBeUndefined();
  });

  it("rejects malformed lock fields", () => {
    expect(() =>
      parseFlatData(JSON.stringify({ ...validFlat, isFlatLocked: "yes" })),
    ).toThrow("The file does not contain a valid flat planner layout.");

    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...validFlat,
          furniturePlacements: [
            {
              id: "sofa-placement",
              templateId: "sofa-template",
              roomId: 1,
              locked: "yes",
              x: 90,
              y: 80,
              rotation: 0,
            },
          ],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");
  });

  it("preserves door swing direction and rejects invalid directions", () => {
    const flatWithDoorSwing = {
      ...validFlat,
      wallOpenings: [
        {
          id: "door-1",
          sourceId: "1-top",
          offset: 40,
          width: 90,
          kind: "door",
          swingSide: "right",
        },
      ],
    };

    expect(parseFlatData(JSON.stringify(flatWithDoorSwing))).toEqual(
      flatWithDoorSwing,
    );
    expect(() =>
      parseFlatData(
        JSON.stringify({
          ...flatWithDoorSwing,
          wallOpenings: [
            { ...flatWithDoorSwing.wallOpenings[0], swingSide: "up" },
          ],
        }),
      ),
    ).toThrow("The file does not contain a valid flat planner layout.");
  });

  it("accepts composed furniture templates with geometric components", () => {
    const flatWithComposedFurniture = {
      ...validFlat,
      furnitureTemplates: [
        {
          id: "table-set",
          name: "Table set",
          shape: "rectangle",
          width: 180,
          length: 90,
          components: [
            {
              id: "table",
              shape: "rectangle",
              x: 0,
              y: 0,
              width: 120,
              length: 90,
              rotation: 0,
            },
            {
              id: "bench",
              shape: "right-triangle",
              x: 120,
              y: 15,
              width: 60,
              length: 60,
              rotation: 0,
            },
          ],
        },
      ],
    };

    expect(parseFlatData(JSON.stringify(flatWithComposedFurniture))).toEqual(
      flatWithComposedFurniture,
    );
  });

  it("preserves mirrored room and furniture components and accepts legacy components", () => {
    const flatWithMirroredComponents: Flat = {
      ...validFlat,
      rooms: [
        {
          ...validFlat.rooms[0]!,
          components: [
            {
              id: "triangle-room",
              shape: "right-triangle",
              x: 0,
              y: 0,
              width: 200,
              length: 150,
              rotation: 90,
              mirrorHorizontal: true,
            },
          ],
        },
      ],
      furnitureTemplates: [
        {
          id: "mirrored-table",
          name: "Mirrored table",
          shape: "right-triangle",
          width: 80,
          length: 60,
          components: [
            {
              id: "triangle-furniture",
              shape: "right-triangle",
              x: 0,
              y: 0,
              width: 80,
              length: 60,
              rotation: 0,
              mirrorVertical: true,
            },
          ],
        },
      ],
    };

    expect(
      parseFlatData(serializeFlatData(flatWithMirroredComponents)),
    ).toEqual(flatWithMirroredComponents);
    expect(parseFlatData(JSON.stringify(validFlat))).toEqual(validFlat);
  });

  it("rejects malformed component mirror fields", () => {
    const invalidFlat = {
      ...validFlat,
      rooms: [
        {
          ...validFlat.rooms[0],
          components: [
            {
              ...validFlat.rooms[0]?.components[0],
              mirrorHorizontal: "yes",
            },
          ],
        },
      ],
    };

    expect(() => parseFlatData(JSON.stringify(invalidFlat))).toThrow(
      "The file does not contain a valid flat planner layout.",
    );
  });

  it("rejects invalid furniture composition components", () => {
    const invalidFurniture = {
      ...validFlat,
      furnitureTemplates: [
        {
          id: "broken",
          name: "Broken",
          shape: "rectangle",
          width: 100,
          length: 60,
          components: [],
        },
      ],
    };

    expect(() => parseFlatData(JSON.stringify(invalidFurniture))).toThrow(
      "The file does not contain a valid flat planner layout.",
    );
  });

  it("reports malformed JSON", () => {
    expect(() => parseFlatData("{")).toThrow("The file is not valid JSON.");
  });

  it("rejects invalid room geometry before importing", () => {
    const invalidFlat = {
      ...validFlat,
      rooms: [{ ...validFlat.rooms[0], components: [] }],
    };

    expect(() => parseFlatData(JSON.stringify(invalidFlat))).toThrow(
      "The file does not contain a valid flat planner layout.",
    );
  });
});
