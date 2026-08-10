import { describe, expect, it } from "vitest";
import {
  ASPERSORIUM_CAPACITY,
  WATER_BUCKET_FILL,
  aspersoriumWaterVisualLevel,
  normalizeWaterUnits,
} from "../../src/domain/aspersorium-water";

describe("aspersorium water domain", () => {
  it("defines one bucket as one full sixteen-unit reservoir", () => {
    expect(ASPERSORIUM_CAPACITY).toBe(16);
    expect(WATER_BUCKET_FILL).toBe(16);
  });

  it("normalizes persisted water independently from item charges", () => {
    expect(normalizeWaterUnits(-1)).toBe(0);
    expect(normalizeWaterUnits(12.9)).toBe(12);
    expect(normalizeWaterUnits(99)).toBe(16);
    expect(normalizeWaterUnits(Number.NaN)).toBe(0);
    expect(normalizeWaterUnits("16")).toBe(0);
  });

  it("projects exact units into the four visual quarters", () => {
    expect(Array.from({ length: 17 }, (_, units) => aspersoriumWaterVisualLevel(units))).toEqual([
      0,
      1, 1, 1, 1,
      2, 2, 2, 2,
      3, 3, 3, 3,
      4, 4, 4, 4,
    ]);
  });
});
