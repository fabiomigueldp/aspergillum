export const MAX_CHARGES = 3;
export const SPRINKLE_COOLDOWN_TICKS = 18;

export interface AspergillumState {
  readonly charges: number;
  readonly schemaVersion: 1;
}

export interface LoadResult {
  readonly state: AspergillumState;
  readonly waterConsumed: number;
}

export function normalizeCharges(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_CHARGES, Math.trunc(value)));
}

export function loadFromAspersorium(
  state: AspergillumState,
  availableWater: number,
): LoadResult {
  const water = normalizeCharges(availableWater);
  const capacity = MAX_CHARGES - normalizeCharges(state.charges);
  const transferred = Math.min(water, capacity);

  return {
    state: { charges: state.charges + transferred, schemaVersion: 1 },
    waterConsumed: transferred,
  };
}

export function consumeCharge(state: AspergillumState): AspergillumState | undefined {
  const charges = normalizeCharges(state.charges);
  if (charges === 0) return undefined;
  return { charges: charges - 1, schemaVersion: 1 };
}

export function canSprinkle(lastTick: number | undefined, currentTick: number): boolean {
  return lastTick === undefined || currentTick - lastTick >= SPRINKLE_COOLDOWN_TICKS;
}

export function chargeLore(charges: number, locale: "pt_BR" | "en_US" = "pt_BR"): string[] {
  const safe = normalizeCharges(charges);
  return locale === "pt_BR"
    ? [`§7Água benta: §b${safe}§7/${MAX_CHARGES}`, "§8Ataque: aspergir • Usar na caldeirinha: carregar"]
    : [`§7Holy water: §b${safe}§7/${MAX_CHARGES}`, "§8Attack: sprinkle • Use on aspersorium: load"];
}
