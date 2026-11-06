import type { BlockPermutation } from "@minecraft/server";
import { describe, expect, it } from "vitest";
import { encodeAspersoriumContents, decodeAspersoriumContents, encodeTableContents, decodeTableContents, ASPERSORIUM_LAYOUT, TABLE_LAYOUT, compactStateDefinitions } from "../../src/domain/block-state-layout";
import { decodeAspersoriumWater, withAspersoriumWater } from "../../src/infrastructure/aspersorium-water-state";
import { withAspersoriumOccupancy, withTableOccupancy } from "../../src/infrastructure/compact-block-state";

class Permutation {
  constructor(readonly states: Record<string, number | boolean | string>) {}
  getAllStates() { return { ...this.states }; }
  withState(key: string, value: number) { return new Permutation({ ...this.states, [key]: value }); }
  api() { return this as unknown as BlockPermutation; }
}

describe("compact contents adapters", () => {
  it("round-trips every water/occupancy/rotation and preserves cosmetics on every water write", () => {
    const unique = new Set<string>();
    for (let waterUnits = 0; waterUnits <= 16; waterUnits++) for (let occupancy = 0; occupancy <= 16; occupancy++) {
      const cosmeticIndex = occupancy ? occupancy - 1 : null;
      const encoded = encodeAspersoriumContents({ waterUnits, cosmeticIndex });
      unique.add(JSON.stringify(encoded));
      expect(decodeAspersoriumWater(encoded)).toBe(waterUnits);
      expect(decodeAspersoriumContents(encoded)).toEqual({ waterUnits, cosmeticIndex });
      for (let rotation = 0; rotation < 16; rotation++) {
        const original = new Permutation({ ...encoded, "aspergillum:rotation": rotation });
        for (let next = 0; next <= 16; next++) {
          const updated = withAspersoriumWater(original.api(), next).getAllStates();
          expect(decodeAspersoriumContents(updated)).toEqual({ waterUnits: next, cosmeticIndex });
          expect(updated["aspergillum:rotation"]).toBe(rotation);
        }
        const undocked = withAspersoriumOccupancy(original.api(), null).getAllStates();
        expect(decodeAspersoriumContents(undocked)).toEqual({ waterUnits, cosmeticIndex: null });
        expect(undocked["aspergillum:rotation"]).toBe(rotation);
        expect(original.getAllStates()).toEqual({ ...encoded, "aspergillum:rotation": rotation });
      }
    }
    expect(unique.size).toBe(289);
  }, 60000);
  it("preserves all table rotations across every finish and removal", () => {
    for (let rotation = 0; rotation < 16; rotation++) for (let cosmeticIndex = 0; cosmeticIndex < 16; cosmeticIndex++) {
      const original = new Permutation({ ...encodeTableContents({ cosmeticIndex: null }), "aspergillum:table_rotation": rotation });
      const updated = withTableOccupancy(original.api(), cosmeticIndex);
      expect(decodeTableContents(updated.getAllStates())).toEqual({ cosmeticIndex });
      expect(updated.getAllStates()["aspergillum:table_rotation"]).toBe(rotation);
      expect(decodeTableContents(withTableOccupancy(updated, null).getAllStates())).toEqual({ cosmeticIndex: null });
    }
  });
  it("rejects missing, legacy, mixed, fractional and reserved states without normalizing", () => {
    const valid = encodeAspersoriumContents({ waterUnits: 0, cosmeticIndex: null });
    for (const malformed of [{}, {"aspergillum:water_base": 0}, { ...valid, "aspergillum:cosmetic": 0 }, { ...valid, "aspergillum:contents_a": 0.5 }, { ...valid, "aspergillum:contents_b": 3 }]) {
      expect(() => decodeAspersoriumContents(malformed)).toThrow();
    }
    for (let index = 289; index < 294; index++) {
      let remaining = index;
      const states: Record<string, number> = {};
      ASPERSORIUM_LAYOUT.keys.forEach((key, i) => { const radix = ASPERSORIUM_LAYOUT.radices[i]!; states[key] = remaining % radix; remaining = Math.floor(remaining / radix); });
      expect(() => decodeAspersoriumContents(states)).toThrow(/padding/);
    }
    expect(() => decodeTableContents({ "aspergillum:table_contents_a": 1, "aspergillum:table_contents_b": 8 })).toThrow(/padding/);
    for (const waterUnits of [-1, 17, 0.5, NaN, Infinity]) expect(() => encodeAspersoriumContents({ waterUnits, cosmeticIndex: null })).toThrow();
    for (const cosmeticIndex of [-1, 16, 0.5, NaN]) expect(() => encodeTableContents({ cosmeticIndex })).toThrow();
    expect(Object.values(compactStateDefinitions(ASPERSORIUM_LAYOUT)).map(v => v.length)).toEqual([2, 3, 7, 7]);
    expect(Object.values(compactStateDefinitions(TABLE_LAYOUT)).map(v => v.length)).toEqual([2, 9]);
  });
  it("never publishes intermediate digits and leaves original unchanged if a digit write fails", () => {
    const original = new Permutation(encodeAspersoriumContents({ waterUnits: 8, cosmeticIndex: 15 }));
    original.withState = () => { throw new Error("injected digit failure"); };
    expect(() => withAspersoriumWater(original.api(), 16)).toThrow("injected");
    expect(decodeAspersoriumContents(original.getAllStates())).toEqual({ waterUnits: 8, cosmeticIndex: 15 });
  });
});
