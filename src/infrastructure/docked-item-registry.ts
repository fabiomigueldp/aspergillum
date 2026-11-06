import { world, type Vector3 } from "@minecraft/server";
import {
  dockedEntryKey,
  dockedShardPropertyId,
  parseDockedRegistryShard,
  type DockedAspergillumSnapshot,
} from "../domain/docking";
import {
  CHARGES_PROPERTY,
  COSMETIC_ID_PROPERTY,
  INSTANCE_ID_PROPERTY,
  SCHEMA_PROPERTY,
  SPRAY_PROFILE_ID_PROPERTY,
} from "./constants";

const MAX_SHARD_BYTES = 30_000;
const RESERVED_ITEM_PROPERTIES = new Set([
  CHARGES_PROPERTY, COSMETIC_ID_PROPERTY, INSTANCE_ID_PROPERTY, SCHEMA_PROPERTY, SPRAY_PROFILE_ID_PROPERTY,
]);

function utf8Length(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return length;
}

function orderedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(orderedJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${orderedJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

interface StoredShard extends Record<string, unknown> {
  schemaVersion: 1;
  entries: Record<string, unknown>;
}

/** Preserve the stored document; only the requested address is interpreted. */
function readShard(dimensionId: string, location: Vector3): StoredShard {
  const propertyId = dockedShardPropertyId(dimensionId, location);
  const stored = world.getDynamicProperty(propertyId);
  if (stored === undefined) return { schemaVersion: 1, entries: {} };
  if (typeof stored !== "string") throw new Error(`Docked registry ${propertyId} is not a string`);
  let decoded: unknown;
  try {
    decoded = JSON.parse(stored) as unknown;
  } catch {
    throw new Error(`Docked registry ${propertyId} contains invalid JSON`);
  }
  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    throw new Error(`Docked registry ${propertyId} has an invalid root`);
  }
  const document = decoded as Record<string, unknown>;
  if (document.schemaVersion !== 1) throw new Error(`Unsupported docked registry schema ${String(document.schemaVersion)}`);
  if (typeof document.entries !== "object" || document.entries === null || Array.isArray(document.entries)) {
    throw new Error(`Docked registry ${propertyId} has invalid entries`);
  }
  return document as StoredShard;
}

/** The permissive domain parser must not silently discard the target's data. */
function readSnapshot(value: unknown): DockedAspergillumSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Docked item snapshot is invalid");
  }
  const original = value as Record<string, unknown>;
  let expected = original;
  if (original.schemaVersion === 1) {
    if (original.charges !== undefined && original.charges !== 0) {
      throw new Error("Docked item has unsupported legacy charges");
    }
    expected = { ...original, schemaVersion: 2, charges: 0 };
  }
  const parsed = parseDockedRegistryShard({ schemaVersion: 1, entries: { "0,0,0": value } }).entries["0,0,0"];
  if (parsed === undefined || orderedJson(expected) !== orderedJson(parsed)) {
    throw new Error("Docked item snapshot contains unsupported or lossy data");
  }
  for (const [key, property] of Object.entries(parsed.customProperties)) {
    if (RESERVED_ITEM_PROPERTIES.has(key)
      || (typeof property === "object" && orderedJson(property) !== orderedJson({ kind: "vector3", x: property.x, y: property.y, z: property.z }))) {
      throw new Error("Docked item snapshot has unsupported item metadata");
    }
  }
  return parsed;
}

function targetSnapshot(shard: StoredShard, key: string): DockedAspergillumSnapshot | undefined {
  return Object.hasOwn(shard.entries, key) ? readSnapshot(shard.entries[key]) : undefined;
}

function writeShard(dimensionId: string, location: Vector3, shard: StoredShard): void {
  const propertyId = dockedShardPropertyId(dimensionId, location);
  // Removing the final known item must not discard unrelated root metadata.
  if (Object.keys(shard.entries).length === 0
    && Object.keys(shard).every((key) => key === "schemaVersion" || key === "entries")) {
    world.setDynamicProperty(propertyId, undefined);
    return;
  }
  const serialized = JSON.stringify(shard, (_key, value: unknown) => {
    // JSON.parse can decode out-of-range exponents as Infinity. Never rewrite
    // that opaque neighbor value as null while updating another address.
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Docked registry contains a number outside the supported range");
    return value;
  });
  if (utf8Length(serialized) > MAX_SHARD_BYTES) {
    throw new Error(`Docked aspergillum shard exceeds ${MAX_SHARD_BYTES} bytes`);
  }
  world.setDynamicProperty(propertyId, serialized);
}

export function getDockedSnapshot(dimensionId: string, location: Vector3): DockedAspergillumSnapshot | undefined {
  return targetSnapshot(readShard(dimensionId, location), dockedEntryKey(location));
}

export function setDockedSnapshot(
  dimensionId: string,
  location: Vector3,
  snapshot: DockedAspergillumSnapshot,
): DockedAspergillumSnapshot | undefined {
  const shard = readShard(dimensionId, location);
  const key = dockedEntryKey(location);
  const previous = targetSnapshot(shard, key);
  const validated = readSnapshot(snapshot);
  writeShard(dimensionId, location, {
    ...shard,
    entries: { ...shard.entries, [key]: validated },
  });
  return previous;
}

export function deleteDockedSnapshot(
  dimensionId: string,
  location: Vector3,
): DockedAspergillumSnapshot | undefined {
  const shard = readShard(dimensionId, location);
  const key = dockedEntryKey(location);
  const previous = targetSnapshot(shard, key);
  if (previous === undefined) return undefined;
  const entries = { ...shard.entries };
  delete entries[key];
  writeShard(dimensionId, location, { ...shard, entries });
  return previous;
}
