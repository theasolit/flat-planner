import { describe, expect, it } from "vitest";
import { getFitScale, getFloorPlanBounds } from "../viewport";
import type { WallSegment } from "../../types";

const wallSegment: WallSegment = {
  id: "wall-1",
  start: [10, 20],
  end: [110, 20],
  outwardNormal: [0, -1],
  length: 100,
  thickness: 5,
  sources: [],
};

describe("floor plan viewport", () => {
  it("calculates bounds including wall thickness", () => {
    expect(getFloorPlanBounds([wallSegment])).toEqual({
      minX: 5,
      minY: 15,
      maxX: 115,
      maxY: 25,
      width: 110,
      height: 10,
    });
  });

  it("returns no bounds when there are no wall segments", () => {
    expect(getFloorPlanBounds([])).toBeNull();
  });

  it("fits bounds inside the canvas with the existing padding", () => {
    const bounds = {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 100,
      width: 200,
      height: 100,
    };

    expect(getFitScale(bounds, { width: 500, height: 300 })).toBe(4.36);
  });

  it("uses the default scale until bounds and canvas dimensions are available", () => {
    expect(getFitScale(null, { width: 500, height: 300 })).toBe(1);
    expect(
      getFitScale(
        {
          minX: 0,
          minY: 0,
          maxX: 200,
          maxY: 100,
          width: 200,
          height: 100,
        },
        { width: 0, height: 0 },
      ),
    ).toBe(1);
  });
});
