export const MAX_CHARGES = 3;
export const SPRINKLE_COOLDOWN_TICKS = 18;

export interface AspergillumState {
  readonly charges: number;
  readonly schemaVersion: 1;
}

export interface LoadResult {
  readonly state: AspergillumState;
  readonly transferred: number;
  readonly nextWater: number;
}

export type ChargePolicy = "consume" | "retain";
export type WaterPolicy = "consume" | "retain";

export interface SprinkleResolution {
  readonly allowed: boolean;
  readonly state: AspergillumState;
  readonly consumed: 0 | 1;
}

export function normalizeCharges(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_CHARGES, Math.trunc(value)));
}

export function loadFromAspersorium(
  state: AspergillumState,
  availableWater: number,
  policy: WaterPolicy = "consume",
): LoadResult {
  const water = normalizeCharges(availableWater);
  const charges = normalizeCharges(state.charges);
  const capacity = MAX_CHARGES - charges;
  const transferred = Math.min(water, capacity);

  return {
    state: { charges: charges + transferred, schemaVersion: 1 },
    transferred,
    nextWater: policy === "retain" ? water : water - transferred,
  };
}

export function resolveSprinkle(
  state: AspergillumState,
  policy: ChargePolicy = "consume",
): SprinkleResolution {
  const charges = normalizeCharges(state.charges);
  if (charges === 0) {
    return {
      allowed: false,
      state: { charges: 0, schemaVersion: 1 },
      consumed: 0,
    };
  }
  if (policy === "retain") {
    return {
      allowed: true,
      state: { charges, schemaVersion: 1 },
      consumed: 0,
    };
  }
  return {
    allowed: true,
    state: { charges: charges - 1, schemaVersion: 1 },
    consumed: 1,
  };
}

export function consumeCharge(state: AspergillumState): AspergillumState | undefined {
  const result = resolveSprinkle(state, "consume");
  return result.allowed ? result.state : undefined;
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
