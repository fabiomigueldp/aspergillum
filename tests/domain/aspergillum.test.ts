import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  canSprinkle,
  consumeCharge,
  createDefaultAspergillumState,
  loadFromAspersorium,
  migrateAspergillumState,
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

  it("migrates legacy state without losing finite charges", () => {
    expect(migrateAspergillumState({ charges: 2, schemaVersion: 1 })).toEqual({
      status: "migrated",
      state: {
        charges: 2,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        cosmeticId: "classic",
        sprayProfileId: "standard",
      },
    });
  });

  it("does not downgrade a future schema", () => {
    expect(migrateAspergillumState({ charges: 2, schemaVersion: 99 })).toEqual({
      status: "future",
      state: {
        charges: 2,
        schemaVersion: 99,
        cosmeticId: "classic",
        sprayProfileId: "standard",
      },
    });
  });

  it("transfers only the available capacity", () => {
    const state = createDefaultAspergillumState(2);
    const result = loadFromAspersorium(state, 3);
    expect(result).toEqual({ state: { ...state, charges: 3 }, transferred: 1, nextWater: 2 });
  });

  it("always adds to the normalized charge value", () => {
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: -99 }, 2).state.charges).toBe(2);
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: 99 }, 3).state.charges).toBe(3);
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: Number.NaN }, 1).state.charges).toBe(1);
  });

  it("resolves all finite charge and water combinations without loss", () => {
    for (let charges = 0; charges <= 3; charges += 1) {
      for (let water = 0; water <= 3; water += 1) {
        const result = loadFromAspersorium(createDefaultAspergillumState(charges), water);
        const expectedTransfer = Math.min(water, 3 - charges);
        expect(result.transferred).toBe(expectedTransfer);
        expect(result.state.charges).toBe(charges + expectedTransfer);
        expect(result.nextWater).toBe(water - expectedTransfer);
      }
    }
  });

  it("retains aspersorium water under the Creative policy", () => {
    const state = createDefaultAspergillumState(1);
    const result = loadFromAspersorium(state, 2, "retain");
    expect(result).toEqual({ state: { ...state, charges: 3 }, transferred: 2, nextWater: 2 });
  });

  it("consumes a charge and rejects an empty sprinkle", () => {
    expect(consumeCharge(createDefaultAspergillumState(1))?.charges).toBe(0);
    expect(consumeCharge(createDefaultAspergillumState(0))).toBeUndefined();
  });

  it("retains finite charges under the Creative policy", () => {
    const state = createDefaultAspergillumState(1);
    expect(resolveSprinkle(state, "retain")).toEqual({
      allowed: true,
      state,
      consumed: 0,
    });
    expect(resolveSprinkle(createDefaultAspergillumState(0), "retain").allowed).toBe(false);
  });

  it("enforces the recovery window", () => {
    expect(canSprinkle(undefined, 100)).toBe(true);
    expect(canSprinkle(90, 100)).toBe(false);
    expect(canSprinkle(82, 100)).toBe(true);
  });
});
