import { describe, expect, it } from "vitest";
import { canSprinkle, consumeCharge, loadFromAspersorium, normalizeCharges } from "../../src/domain/aspergillum";

describe("aspergillum domain", () => {
  it("clamps persisted charge values", () => {
    expect(normalizeCharges(-4)).toBe(0);
    expect(normalizeCharges(2.9)).toBe(2);
    expect(normalizeCharges(99)).toBe(3);
    expect(normalizeCharges("3")).toBe(0);
  });

  it("transfers only the available capacity", () => {
    const result = loadFromAspersorium({ charges: 2, schemaVersion: 1 }, 3);
    expect(result).toEqual({ state: { charges: 3, schemaVersion: 1 }, waterConsumed: 1 });
  });

  it("consumes a charge and rejects an empty sprinkle", () => {
    expect(consumeCharge({ charges: 1, schemaVersion: 1 })?.charges).toBe(0);
    expect(consumeCharge({ charges: 0, schemaVersion: 1 })).toBeUndefined();
  });

  it("enforces the recovery window", () => {
    expect(canSprinkle(undefined, 100)).toBe(true);
    expect(canSprinkle(90, 100)).toBe(false);
    expect(canSprinkle(82, 100)).toBe(true);
  });
});
