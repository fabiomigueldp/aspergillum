export const METAL_FINISH_IDS = ["silver", "antique", "gilded", "bronze"] as const;
export const GRIP_FINISH_IDS = ["chestnut", "oxblood", "black", "ivory"] as const;

export type MetalFinishId = typeof METAL_FINISH_IDS[number];
export type GripFinishId = typeof GRIP_FINISH_IDS[number];

export interface AspergillumCosmetic {
  readonly id: string;
  readonly metal: MetalFinishId;
  readonly grip: GripFinishId;
  readonly index: number;
}

function cosmeticId(metal: MetalFinishId, grip: GripFinishId): string {
  return metal === "silver" && grip === "chestnut" ? "classic" : `${metal}_${grip}`;
}

function stableCosmeticIndex(metal: MetalFinishId, grip: GripFinishId): number {
  const metalIndex = METAL_FINISH_IDS.indexOf(metal);
  const gripIndex = GRIP_FINISH_IDS.indexOf(grip);
  // The original 3x3 matrix is a persisted world contract and must remain 0..8.
  if (metalIndex < 3 && gripIndex < 3) return metalIndex * 3 + gripIndex;
  if (metalIndex < 3 && grip === "ivory") return 9 + metalIndex;
  return 12 + gripIndex;
}

export const ASPERGILLUM_COSMETICS = Object.freeze(
  METAL_FINISH_IDS.flatMap((metal) =>
    GRIP_FINISH_IDS.map((grip) => Object.freeze({
      id: cosmeticId(metal, grip),
      metal,
      grip,
      index: stableCosmeticIndex(metal, grip),
    })),
  ).sort((left, right) => left.index - right.index),
);

export const DEFAULT_COSMETIC = ASPERGILLUM_COSMETICS[0] as AspergillumCosmetic;

export function resolveCosmetic(id: unknown): AspergillumCosmetic {
  return ASPERGILLUM_COSMETICS.find((cosmetic) => cosmetic.id === id) ?? DEFAULT_COSMETIC;
}

export function resolveCosmeticSelection(metal: unknown, grip: unknown): AspergillumCosmetic {
  return ASPERGILLUM_COSMETICS.find(
    (cosmetic) => cosmetic.metal === metal && cosmetic.grip === grip,
  ) ?? DEFAULT_COSMETIC;
}

export function resolveCosmeticIndex(index: unknown): AspergillumCosmetic {
  if (typeof index !== "number" || !Number.isInteger(index)) return DEFAULT_COSMETIC;
  return ASPERGILLUM_COSMETICS.find((cosmetic) => cosmetic.index === index) ?? DEFAULT_COSMETIC;
}
