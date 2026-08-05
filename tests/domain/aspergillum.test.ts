import { describe, expect, it } from "vitest";
import {
  ASPERGILLUM_CAPACITY,
  CURRENT_SCHEMA_VERSION,
  canSprinkle,
  consumeCharge,
  createDefaultAspergillumState,
  loadFromAspersorium,
  migrateAspergillumState,
  normalizeCharges,
  resolveSprinkle,
} from "../../src/domain/aspergillum";
import { ASPERSORIUM_CAPACITY } from "../../src/domain/aspersorium-water";

describe("aspergillum domain", () => {
  it("clamps persisted charge values", () => {
    expect(normalizeCharges(-4)).toBe(0);
    expect(normalizeCharges(2.9)).toBe(2);
    expect(normalizeCharges(99)).toBe(4);
    expect(normalizeCharges("3")).toBe(0);
  });

  it("migrates schema 2 state without losing finite charges", () => {
    expect(migrateAspergillumState({ charges: 3, schemaVersion: 2 })).toEqual({
      status: "migrated",
      state: {
        charges: 3,
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
    const result = loadFromAspersorium(state, 16);
    expect(result).toEqual({ state: { ...state, charges: 4 }, transferred: 2, nextWater: 14 });
  });

  it("always adds to the normalized charge value", () => {
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: -99 }, 2).state.charges).toBe(2);
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: 99 }, 16).state.charges).toBe(4);
    expect(loadFromAspersorium({ ...createDefaultAspergillumState(), charges: Number.NaN }, 1).state.charges).toBe(1);
  });

  it("resolves all finite charge and water combinations without loss", () => {
    for (let charges = 0; charges <= ASPERGILLUM_CAPACITY; charges += 1) {
      for (let water = 0; water <= ASPERSORIUM_CAPACITY; water += 1) {
        const result = loadFromAspersorium(createDefaultAspergillumState(charges), water);
        const expectedTransfer = Math.min(water, ASPERGILLUM_CAPACITY - charges);
        expect(result.transferred).toBe(expectedTransfer);
        expect(result.state.charges).toBe(charges + expectedTransfer);
        expect(result.nextWater).toBe(water - expectedTransfer);
      }
    }
  });

  it("retains aspersorium water under the Creative policy", () => {
    const state = createDefaultAspergillumState(1);
    const result = loadFromAspersorium(state, 16, "retain");
    expect(result).toEqual({ state: { ...state, charges: 4 }, transferred: 3, nextWater: 16 });
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
