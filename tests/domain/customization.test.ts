import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ASPERGILLUM_COSMETICS,
  DEFAULT_COSMETIC,
  GRIP_FINISH_IDS,
  METAL_FINISH_IDS,
  resolveCosmetic,
  resolveCosmeticIndex,
  resolveCosmeticSelection,
} from "../../src/domain/customization";

describe("aspergillum customization", () => {
  it("exposes a complete 4x4 matrix and keeps classic at index zero", () => {
    expect(ASPERGILLUM_COSMETICS).toHaveLength(16);
    expect(new Set(ASPERGILLUM_COSMETICS.map((cosmetic) => cosmetic.id)).size).toBe(16);
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
    expect(METAL_FINISH_IDS).toEqual(catalog.metalFinishes);
    expect(GRIP_FINISH_IDS).toEqual(catalog.gripFinishes);
    expect(ASPERGILLUM_COSMETICS).toEqual(catalog.cosmetics);
  });

  it("contains each Cartesian metal and grip pair exactly once", () => {
    const expectedPairs = METAL_FINISH_IDS.flatMap((metal) =>
      GRIP_FINISH_IDS.map((grip) => `${metal}:${grip}`),
    );
    const actualPairs = ASPERGILLUM_COSMETICS.map(({ metal, grip }) => `${metal}:${grip}`);

    expect(actualPairs).toHaveLength(16);
    expect(new Set(actualPairs).size).toBe(16);
    expect(new Set(actualPairs)).toEqual(new Set(expectedPairs));
  });

  it("resolves independent metal and grip selections", () => {
    expect(resolveCosmeticSelection("gilded", "oxblood")).toMatchObject({
      id: "gilded_oxblood",
      index: 7,
    });
    expect(resolveCosmeticSelection("silver", "chestnut")).toBe(DEFAULT_COSMETIC);
    expect(resolveCosmeticSelection("bronze", "ivory")).toMatchObject({
      id: "bronze_ivory",
      index: 15,
    });
  });

  it("freezes every published 4x4 id and persisted index", () => {
    expect(ASPERGILLUM_COSMETICS.map(({ id, index }) => ({ id, index }))).toEqual([
      { id: "classic", index: 0 },
      { id: "silver_oxblood", index: 1 },
      { id: "silver_black", index: 2 },
      { id: "antique_chestnut", index: 3 },
      { id: "antique_oxblood", index: 4 },
      { id: "antique_black", index: 5 },
      { id: "gilded_chestnut", index: 6 },
      { id: "gilded_oxblood", index: 7 },
      { id: "gilded_black", index: 8 },
      { id: "silver_ivory", index: 9 },
      { id: "antique_ivory", index: 10 },
      { id: "gilded_ivory", index: 11 },
      { id: "bronze_chestnut", index: 12 },
      { id: "bronze_oxblood", index: 13 },
      { id: "bronze_black", index: 14 },
      { id: "bronze_ivory", index: 15 },
    ]);
  });

  it("round-trips every persisted cosmetic index", () => {
    for (const cosmetic of ASPERGILLUM_COSMETICS) {
      expect(resolveCosmeticIndex(cosmetic.index)).toBe(cosmetic);
    }
  });

  it("normalizes unknown ids and indices to the approved classic appearance", () => {
    expect(resolveCosmetic("unknown")).toBe(DEFAULT_COSMETIC);
    expect(resolveCosmeticIndex(-1)).toBe(DEFAULT_COSMETIC);
    expect(resolveCosmeticIndex(16)).toBe(DEFAULT_COSMETIC);
  });
});
