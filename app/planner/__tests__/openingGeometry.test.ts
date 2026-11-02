import { describe, expect, it } from "vitest";
import { findOpeningOffset, findOpeningSlot } from "../openingGeometry";
import type { WallOpening } from "../types";

const opening = (
  id: string,
  sourceId: string,
  offset: number,
  width: number,
): WallOpening => ({ id, sourceId, offset, width, kind: "door" });

describe("opening placement", () => {
  it("finds the first available segment on an edge", () => {
    expect(
      findOpeningSlot(
        "edge",
        [opening("first", "edge", 90, 90)],
        400,
      ),
    ).toEqual({ offset: 0, width: 90 });
  });

  it("chooses the next gap when the edge start is occupied", () => {
    expect(
      findOpeningSlot(
        "edge",
        [opening("first", "edge", 0, 100)],
        400,
      ),
    ).toEqual({ offset: 100, width: 90 });
  });

  it("returns no slot when the edge is full", () => {
    expect(
      findOpeningSlot(
        "edge",
        [opening("first", "edge", 0, 400)],
        400,
      ),
    ).toBeUndefined();
  });

  it("moves an opening to the nearest non-overlapping position", () => {
    expect(
      findOpeningOffset(
        90,
        80,
        400,
        [opening("neighbor", "edge", 100, 80)],
      ),
    ).toBe(20);
  });

  it("rejects openings wider than their target edge", () => {
    expect(findOpeningOffset(0, 101, 100, [])).toBeUndefined();
  });
});
