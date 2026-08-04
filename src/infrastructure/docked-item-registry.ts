import { world, type Vector3 } from "@minecraft/server";
import {
  dockedEntryKey,
  dockedShardPropertyId,
  parseDockedRegistryShard,
  type DockedAspergillumSnapshot,
  type DockedRegistryShard,
} from "../domain/docking";

const MAX_SHARD_BYTES = 30_000;

function utf8Length(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return length;
}

function readShard(dimensionId: string, location: Vector3): DockedRegistryShard {
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
  const version = (decoded as { readonly schemaVersion?: unknown }).schemaVersion;
  if (version !== 1) throw new Error(`Unsupported docked registry schema ${String(version)}`);
  return parseDockedRegistryShard(decoded);
}

function writeShard(dimensionId: string, location: Vector3, shard: DockedRegistryShard): void {
  const propertyId = dockedShardPropertyId(dimensionId, location);
  if (Object.keys(shard.entries).length === 0) {
    world.setDynamicProperty(propertyId, undefined);
    return;
  }
  const serialized = JSON.stringify(shard);
  if (utf8Length(serialized) > MAX_SHARD_BYTES) {
    throw new Error(`Docked aspergillum shard exceeds ${MAX_SHARD_BYTES} bytes`);
  }
  world.setDynamicProperty(propertyId, serialized);
}

export function getDockedSnapshot(dimensionId: string, location: Vector3): DockedAspergillumSnapshot | undefined {
  return readShard(dimensionId, location).entries[dockedEntryKey(location)];
}

export function setDockedSnapshot(
  dimensionId: string,
  location: Vector3,
  snapshot: DockedAspergillumSnapshot,
): DockedAspergillumSnapshot | undefined {
  const shard = readShard(dimensionId, location);
  const key = dockedEntryKey(location);
  const previous = shard.entries[key];
  writeShard(dimensionId, location, {
    schemaVersion: 1,
    entries: { ...shard.entries, [key]: snapshot },
  });
  return previous;
}

export function deleteDockedSnapshot(
  dimensionId: string,
  location: Vector3,
): DockedAspergillumSnapshot | undefined {
  const shard = readShard(dimensionId, location);
  const key = dockedEntryKey(location);
  const previous = shard.entries[key];
  if (previous === undefined) return undefined;
  const entries = { ...shard.entries };
  delete entries[key];
  writeShard(dimensionId, location, { schemaVersion: 1, entries });
  return previous;
}
