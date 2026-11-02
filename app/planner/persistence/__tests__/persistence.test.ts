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

  it("accepts older flat saves without optional collections", () => {
    const legacyFlat = {
      rooms: validFlat.rooms,
      selectedRoomId: validFlat.selectedRoomId,
    };

    expect(parseFlatData(JSON.stringify(legacyFlat)).rooms).toEqual(
      validFlat.rooms,
    );
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
