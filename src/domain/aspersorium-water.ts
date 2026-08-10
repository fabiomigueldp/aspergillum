export const ASPERSORIUM_CAPACITY = 16;
export const WATER_BUCKET_FILL = ASPERSORIUM_CAPACITY;

export function normalizeWaterUnits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(ASPERSORIUM_CAPACITY, Math.trunc(value)));
}

export type AspersoriumWaterVisualLevel = 0 | 1 | 2 | 3 | 4;

export function aspersoriumWaterVisualLevel(value: unknown): AspersoriumWaterVisualLevel {
  const units = normalizeWaterUnits(value);
  if (units === 0) return 0;
  return Math.ceil(units / 4) as AspersoriumWaterVisualLevel;
}
