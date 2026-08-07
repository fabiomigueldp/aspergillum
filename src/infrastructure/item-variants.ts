import { ASPERGILLUM_COSMETICS, resolveCosmetic } from "../domain/customization";

export const BASE_ASPERGILLUM_ITEM = "aspergillum:aspergillum";

export function aspergillumItemTypeForCosmetic(cosmeticId: unknown): string {
  const cosmetic = resolveCosmetic(cosmeticId);
  return cosmetic.id === "classic"
    ? BASE_ASPERGILLUM_ITEM
    : `aspergillum:aspergillum_${cosmetic.id}`;
}

export const ASPERGILLUM_ITEM_TYPES = new Set(
  ASPERGILLUM_COSMETICS.map((cosmetic) => aspergillumItemTypeForCosmetic(cosmetic.id)),
);

export function cosmeticIdForAspergillumItemType(typeId: string): string | undefined {
  return ASPERGILLUM_COSMETICS.find(
    (cosmetic) => aspergillumItemTypeForCosmetic(cosmetic.id) === typeId,
  )?.id;
}

export function isAspergillumItemType(typeId: string): boolean {
  return ASPERGILLUM_ITEM_TYPES.has(typeId);
}
