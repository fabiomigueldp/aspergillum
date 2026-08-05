import { describe, expect, it } from "vitest";
import { ASPERSORIUM_CAPACITY } from "../../src/domain/aspersorium-water";
import {
  decodeAspersoriumWater,
  encodeAspersoriumWater,
  WATER_HIGH_BASE,
  WATER_OFFSET_MAX,
} from "../../src/infrastructure/aspersorium-water-state";
import { WATER_BASE_STATE, WATER_OFFSET_STATE } from "../../src/infrastructure/constants";

describe("aspersorium water block-state codec", () => {
  it("round-trips every logical water quantity from zero through sixteen", () => {
    for (let units = 0; units <= ASPERSORIUM_CAPACITY; units += 1) {
      const encoded = encodeAspersoriumWater(units);
      expect(decodeAspersoriumWater({
        [WATER_BASE_STATE]: encoded.base,
        [WATER_OFFSET_STATE]: encoded.offset,
      })).toBe(units);
    }
  });

  it("uses only state values accepted by the compact radix-nine representation", () => {
    for (let units = 0; units <= ASPERSORIUM_CAPACITY; units += 1) {
      const encoded = encodeAspersoriumWater(units);
      expect([0, WATER_HIGH_BASE]).toContain(encoded.base);
      expect(encoded.offset).toBeGreaterThanOrEqual(0);
      expect(encoded.offset).toBeLessThanOrEqual(WATER_OFFSET_MAX);
    }
    expect(encodeAspersoriumWater(8)).toEqual({ base: 0, offset: 8 });
    expect(encodeAspersoriumWater(9)).toEqual({ base: 9, offset: 0 });
    expect(encodeAspersoriumWater(16)).toEqual({ base: 9, offset: 7 });
  });

  it("fails safely for malformed and non-canonical persisted state pairs", () => {
    expect(decodeAspersoriumWater({})).toBe(0);
    expect(decodeAspersoriumWater({
      [WATER_BASE_STATE]: 7,
      [WATER_OFFSET_STATE]: 3,
    })).toBe(3);
    expect(decodeAspersoriumWater({
      [WATER_BASE_STATE]: WATER_HIGH_BASE,
      [WATER_OFFSET_STATE]: WATER_OFFSET_MAX,
    })).toBe(ASPERSORIUM_CAPACITY);
    expect(encodeAspersoriumWater(99)).toEqual({ base: 9, offset: 7 });
  });
});
