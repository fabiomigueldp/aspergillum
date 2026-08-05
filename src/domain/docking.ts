import { normalizeCharges } from "./aspergillum";
import { ASPERSORIUM_CAPACITY, normalizeWaterUnits } from "./aspersorium-water";

export interface DockingResolution {
  readonly allowed: boolean;
  readonly nextWater: number;
  readonly returnedCharges: number;
  readonly reason?: "overflow";
}

export interface SerializedVector3 {
  readonly kind: "vector3";
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type SerializedDynamicProperty = boolean | number | string | SerializedVector3;

export interface DockedAspergillumSnapshot {
  readonly schemaVersion: 1;
  readonly instanceId: string;
  readonly nameTag?: string;
  readonly cosmeticId: string;
  readonly sprayProfileId: string;
  readonly customProperties: Readonly<Record<string, SerializedDynamicProperty>>;
}

export interface DockedRegistryShard {
  readonly schemaVersion: 1;
  readonly entries: Readonly<Record<string, DockedAspergillumSnapshot>>;
}

export function resolveDocking(waterInput: unknown, chargesInput: unknown): DockingResolution {
  const water = normalizeWaterUnits(waterInput);
  const charges = normalizeCharges(chargesInput);
  if (water + charges > ASPERSORIUM_CAPACITY) {
    return { allowed: false, nextWater: water, returnedCharges: 0, reason: "overflow" };
  }
  return { allowed: true, nextWater: water + charges, returnedCharges: charges };
}

function coordinateToken(value: number): string {
  const integer = Math.floor(value);
  return `${integer < 0 ? "n" : "p"}${Math.abs(integer)}`;
}

function safeDimensionToken(dimensionId: string): string {
  const normalized = dimensionId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (normalized.length <= 24) return normalized;
  let hash = 0x811c9dc5;
  for (const character of dimensionId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `${normalized.slice(0, 12)}_${(hash >>> 0).toString(36).padStart(7, "0")}`;
}

export function dockedEntryKey(location: { readonly x: number; readonly y: number; readonly z: number }): string {
  return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

export function dockedShardPropertyId(
  dimensionId: string,
  location: { readonly x: number; readonly z: number },
): string {
  const chunkX = Math.floor(location.x / 16);
  const chunkZ = Math.floor(location.z / 16);
  return `aspergillum:docked_${safeDimensionToken(dimensionId)}_${coordinateToken(chunkX)}_${coordinateToken(chunkZ)}`;
}

function isSerializedVector3(value: unknown): value is SerializedVector3 {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SerializedVector3>;
  return candidate.kind === "vector3"
    && Number.isFinite(candidate.x)
    && Number.isFinite(candidate.y)
    && Number.isFinite(candidate.z);
}

function sanitizeCustomProperties(value: unknown): Record<string, SerializedDynamicProperty> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const output: Record<string, SerializedDynamicProperty> = {};
  for (const [key, property] of Object.entries(value)) {
    if (!/^[a-z0-9_.:-]{1,96}$/i.test(key)) continue;
    if (typeof property === "boolean" || typeof property === "string") output[key] = property;
    else if (typeof property === "number" && Number.isFinite(property)) output[key] = property;
    else if (isSerializedVector3(property)) output[key] = property;
  }
  return output;
}

function sanitizeSnapshot(value: unknown): DockedAspergillumSnapshot | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const candidate = value as Partial<DockedAspergillumSnapshot>;
  if (candidate.schemaVersion !== 1
    || typeof candidate.instanceId !== "string"
    || candidate.instanceId.length === 0
    || candidate.instanceId.length > 128
    || typeof candidate.cosmeticId !== "string"
    || typeof candidate.sprayProfileId !== "string") return undefined;
  return {
    schemaVersion: 1,
    instanceId: candidate.instanceId,
    ...(typeof candidate.nameTag === "string" && candidate.nameTag.length <= 255
      ? { nameTag: candidate.nameTag }
      : {}),
    cosmeticId: candidate.cosmeticId,
    sprayProfileId: candidate.sprayProfileId,
    customProperties: sanitizeCustomProperties(candidate.customProperties),
  };
}

export function parseDockedRegistryShard(value: unknown): DockedRegistryShard {
  let decoded = value;
  if (typeof value === "string") {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      return { schemaVersion: 1, entries: {} };
    }
  }
  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    return { schemaVersion: 1, entries: {} };
  }
  const candidate = decoded as { readonly schemaVersion?: unknown; readonly entries?: unknown };
  if (candidate.schemaVersion !== 1
    || typeof candidate.entries !== "object"
    || candidate.entries === null
    || Array.isArray(candidate.entries)) {
    return { schemaVersion: 1, entries: {} };
  }
  const entries: Record<string, DockedAspergillumSnapshot> = {};
  for (const [key, snapshotValue] of Object.entries(candidate.entries)) {
    if (!/^-?\d+,-?\d+,-?\d+$/.test(key)) continue;
    const snapshot = sanitizeSnapshot(snapshotValue);
    if (snapshot !== undefined) entries[key] = snapshot;
  }
  return { schemaVersion: 1, entries };
}
