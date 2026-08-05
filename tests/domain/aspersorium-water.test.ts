import { describe, expect, it } from "vitest";
import {
  ASPERSORIUM_CAPACITY,
  WATER_BUCKET_FILL,
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
});
