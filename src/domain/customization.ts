export const METAL_FINISH_IDS = ["silver", "antique", "gilded"] as const;
export const GRIP_FINISH_IDS = ["chestnut", "oxblood", "black"] as const;

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

export const ASPERGILLUM_COSMETICS = Object.freeze(
  METAL_FINISH_IDS.flatMap((metal, metalIndex) =>
    GRIP_FINISH_IDS.map((grip, gripIndex) => Object.freeze({
      id: cosmeticId(metal, grip),
      metal,
      grip,
      index: metalIndex * GRIP_FINISH_IDS.length + gripIndex,
    })),
  ),
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
  return ASPERGILLUM_COSMETICS[index] ?? DEFAULT_COSMETIC;
}
