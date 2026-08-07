import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ASPERGILLUM_COSMETICS,
  DEFAULT_COSMETIC,
  resolveCosmetic,
  resolveCosmeticIndex,
  resolveCosmeticSelection,
} from "../../src/domain/customization";

describe("aspergillum customization", () => {
  it("exposes nine stable combinations and keeps classic at index zero", () => {
    expect(ASPERGILLUM_COSMETICS).toHaveLength(9);
    expect(new Set(ASPERGILLUM_COSMETICS.map((cosmetic) => cosmetic.id)).size).toBe(9);
    expect(DEFAULT_COSMETIC).toEqual({
      id: "classic",
      metal: "silver",
      grip: "chestnut",
      index: 0,
    });
  });

  it("matches the asset-generation catalog exactly", () => {
    const catalog = JSON.parse(fs.readFileSync(
      path.resolve(import.meta.dirname, "../../assets-src/customization/catalog.json"),
      "utf8",
    ));
    expect(ASPERGILLUM_COSMETICS).toEqual(catalog.cosmetics);
  });

  it("resolves independent metal and grip selections", () => {
    expect(resolveCosmeticSelection("gilded", "oxblood")).toMatchObject({
      id: "gilded_oxblood",
      index: 7,
    });
    expect(resolveCosmeticSelection("silver", "chestnut")).toBe(DEFAULT_COSMETIC);
  });

  it("normalizes unknown ids and indices to the approved classic appearance", () => {
    expect(resolveCosmetic("unknown")).toBe(DEFAULT_COSMETIC);
    expect(resolveCosmeticIndex(-1)).toBe(DEFAULT_COSMETIC);
    expect(resolveCosmeticIndex(9)).toBe(DEFAULT_COSMETIC);
  });
});
