import { normalizeWaterUnits } from "./aspersorium-water";

export const ASPERGILLUM_CAPACITY = 4;
export const SPRINKLE_COOLDOWN_TICKS = 18;
export const CURRENT_SCHEMA_VERSION = 3;
export const DEFAULT_COSMETIC_ID = "classic";
export const DEFAULT_SPRAY_PROFILE_ID = "standard";

export interface AspergillumState {
  readonly charges: number;
  readonly schemaVersion: number;
  readonly cosmeticId: string;
  readonly sprayProfileId: string;
}

export interface RawAspergillumState {
  readonly charges?: unknown;
  readonly schemaVersion?: unknown;
  readonly cosmeticId?: unknown;
  readonly sprayProfileId?: unknown;
}

export interface AspergillumMigration {
  readonly status: "current" | "migrated" | "future";
  readonly state: AspergillumState;
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
  return Math.max(0, Math.min(ASPERGILLUM_CAPACITY, Math.trunc(value)));
}

function normalizeSchemaVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeIdentifier(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[a-z0-9_.-]{1,64}$/.test(value) ? value : fallback;
}

export function createDefaultAspergillumState(charges: unknown = 0): AspergillumState {
  return {
    charges: normalizeCharges(charges),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cosmeticId: DEFAULT_COSMETIC_ID,
    sprayProfileId: DEFAULT_SPRAY_PROFILE_ID,
  };
}

export function migrateAspergillumState(raw: RawAspergillumState): AspergillumMigration {
  const sourceSchema = normalizeSchemaVersion(raw.schemaVersion);
  const state: AspergillumState = {
    charges: normalizeCharges(raw.charges),
    schemaVersion: sourceSchema > CURRENT_SCHEMA_VERSION ? sourceSchema : CURRENT_SCHEMA_VERSION,
    cosmeticId: normalizeIdentifier(raw.cosmeticId, DEFAULT_COSMETIC_ID),
    sprayProfileId: normalizeIdentifier(raw.sprayProfileId, DEFAULT_SPRAY_PROFILE_ID),
  };
  if (sourceSchema > CURRENT_SCHEMA_VERSION) return { status: "future", state };
  return {
    status: sourceSchema === CURRENT_SCHEMA_VERSION ? "current" : "migrated",
    state,
  };
}

export function loadFromAspersorium(
  state: AspergillumState,
  availableWater: number,
  policy: WaterPolicy = "consume",
): LoadResult {
  const water = normalizeWaterUnits(availableWater);
  const charges = normalizeCharges(state.charges);
  const capacity = ASPERGILLUM_CAPACITY - charges;
  const transferred = Math.min(water, capacity);

  return {
    state: { ...state, charges: charges + transferred },
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
      state: { ...state, charges: 0 },
      consumed: 0,
    };
  }
  if (policy === "retain") {
    return {
      allowed: true,
      state: { ...state, charges },
      consumed: 0,
    };
  }
  return {
    allowed: true,
    state: { ...state, charges: charges - 1 },
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
