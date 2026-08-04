import { describe, expect, it } from "vitest";
import {
  canSprinkle,
  consumeCharge,
  loadFromAspersorium,
  normalizeCharges,
  resolveSprinkle,
} from "../../src/domain/aspergillum";

describe("aspergillum domain", () => {
  it("clamps persisted charge values", () => {
    expect(normalizeCharges(-4)).toBe(0);
    expect(normalizeCharges(2.9)).toBe(2);
    expect(normalizeCharges(99)).toBe(3);
    expect(normalizeCharges("3")).toBe(0);
  });

  it("transfers only the available capacity", () => {
    const result = loadFromAspersorium({ charges: 2, schemaVersion: 1 }, 3);
    expect(result).toEqual({ state: { charges: 3, schemaVersion: 1 }, transferred: 1, nextWater: 2 });
  });

  it("always adds to the normalized charge value", () => {
    expect(loadFromAspersorium({ charges: -99, schemaVersion: 1 }, 2).state.charges).toBe(2);
    expect(loadFromAspersorium({ charges: 99, schemaVersion: 1 }, 3).state.charges).toBe(3);
    expect(loadFromAspersorium({ charges: Number.NaN, schemaVersion: 1 }, 1).state.charges).toBe(1);
  });

  it("resolves all finite charge and water combinations without loss", () => {
    for (let charges = 0; charges <= 3; charges += 1) {
      for (let water = 0; water <= 3; water += 1) {
        const result = loadFromAspersorium({ charges, schemaVersion: 1 }, water);
        const expectedTransfer = Math.min(water, 3 - charges);
        expect(result.transferred).toBe(expectedTransfer);
        expect(result.state.charges).toBe(charges + expectedTransfer);
        expect(result.nextWater).toBe(water - expectedTransfer);
      }
    }
  });

  it("retains aspersorium water under the Creative policy", () => {
    const result = loadFromAspersorium({ charges: 1, schemaVersion: 1 }, 2, "retain");
    expect(result).toEqual({ state: { charges: 3, schemaVersion: 1 }, transferred: 2, nextWater: 2 });
  });

  it("consumes a charge and rejects an empty sprinkle", () => {
    expect(consumeCharge({ charges: 1, schemaVersion: 1 })?.charges).toBe(0);
    expect(consumeCharge({ charges: 0, schemaVersion: 1 })).toBeUndefined();
  });

  it("retains finite charges under the Creative policy", () => {
    expect(resolveSprinkle({ charges: 1, schemaVersion: 1 }, "retain")).toEqual({
      allowed: true,
      state: { charges: 1, schemaVersion: 1 },
      consumed: 0,
    });
    expect(resolveSprinkle({ charges: 0, schemaVersion: 1 }, "retain").allowed).toBe(false);
  });

  it("enforces the recovery window", () => {
    expect(canSprinkle(undefined, 100)).toBe(true);
    expect(canSprinkle(90, 100)).toBe(false);
    expect(canSprinkle(82, 100)).toBe(true);
  });
});
