import { describe, expect, it } from "vitest";
import { ASPERGILLUM_COSMETICS } from "../../src/domain/customization";
import {
  ASPERGILLUM_ITEM_TYPES,
  aspergillumItemTypeForCosmetic,
  cosmeticIdForAspergillumItemType,
  isAspergillumItemType,
} from "../../src/infrastructure/item-variants";

describe("aspergillum item variants", () => {
  it("maps every cosmetic to one stable public item identifier", () => {
    expect(ASPERGILLUM_ITEM_TYPES.size).toBe(9);
    for (const cosmetic of ASPERGILLUM_COSMETICS) {
      const typeId = aspergillumItemTypeForCosmetic(cosmetic.id);
      expect(isAspergillumItemType(typeId)).toBe(true);
      expect(cosmeticIdForAspergillumItemType(typeId)).toBe(cosmetic.id);
    }
  });

  it("preserves the published classic identifier and falls back safely", () => {
    expect(aspergillumItemTypeForCosmetic("classic")).toBe("aspergillum:aspergillum");
    expect(aspergillumItemTypeForCosmetic("future-cosmetic")).toBe("aspergillum:aspergillum");
    expect(isAspergillumItemType("minecraft:stick")).toBe(false);
  });
});
