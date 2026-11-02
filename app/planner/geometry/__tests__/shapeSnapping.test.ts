import { describe, expect, it } from "vitest";
import { snapShapePosition, type ShapeBounds } from "../shapeSnapping";

describe("shape composition snapping", () => {
  it("snaps shape endpoints after the horizontal edges meet", () => {
    const moved: ShapeBounds = {
      minX: 205,
      minY: 105,
      maxX: 305,
      maxY: 205,
    };
    const neighbor: ShapeBounds = {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 100,
    };

    expect(snapShapePosition(moved, [neighbor], 205, 105, 20)).toEqual({
      x: 200,
      y: 100,
    });
  });

  it("aligns top edges while the shapes slide along a vertical edge", () => {
    const moved: ShapeBounds = {
      minX: 205,
      minY: 108,
      maxX: 305,
      maxY: 208,
    };
    const neighbor: ShapeBounds = {
      minX: 0,
      minY: 100,
      maxX: 200,
      maxY: 200,
    };

    expect(snapShapePosition(moved, [neighbor], 205, 108, 20)).toEqual({
      x: 200,
      y: 100,
    });
  });

  it("aligns left edges while shapes slide along a horizontal edge", () => {
    const moved: ShapeBounds = {
      minX: 108,
      minY: 205,
      maxX: 208,
      maxY: 305,
    };
    const neighbor: ShapeBounds = {
      minX: 100,
      minY: 0,
      maxX: 200,
      maxY: 200,
    };

    expect(snapShapePosition(moved, [neighbor], 108, 205, 20)).toEqual({
      x: 100,
      y: 200,
    });
  });

  it("does not snap either axis when no edge is within range", () => {
    const moved: ShapeBounds = {
      minX: 400,
      minY: 400,
      maxX: 500,
      maxY: 500,
    };
    const neighbor: ShapeBounds = {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 200,
    };

    expect(snapShapePosition(moved, [neighbor], 400, 400, 20)).toEqual({
      x: 400,
      y: 400,
    });
  });
});
