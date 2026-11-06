import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@minecraft/server", async () => import("../mocks/compact-runtime"));

import { dockedEntryKey, dockedShardPropertyId, type DockedAspergillumSnapshot } from "../../src/domain/docking";
import { deleteDockedSnapshot, getDockedSnapshot, setDockedSnapshot } from "../../src/infrastructure/docked-item-registry";
import { resetRuntime, world } from "../mocks/compact-runtime";

const dimension = "minecraft:overworld";
const location = { x: 2, y: 64, z: -3 };
const key = dockedEntryKey(location);
const propertyId = dockedShardPropertyId(dimension, location);
const snapshot: DockedAspergillumSnapshot = {
  schemaVersion: 2, instanceId: "preserved-A", charges: 3, nameTag: "Named item",
  cosmeticId: "bronze_ivory", sprayProfileId: "contained",
  customProperties: { "third.party:note": "Preserve this", "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 } },
};
function writeRaw(raw: string) { world.setDynamicProperty(propertyId, raw); world.setDynamicProperty.mockClear(); }
function raw() { return world.getDynamicProperty(propertyId); }
function shard(entries: Record<string, unknown> = { [key]: snapshot }) { return { schemaVersion: 1, entries }; }
beforeEach(() => resetRuntime());

describe("targeted registry updates", () => {
  it("reads a missing target without writing and removes an empty plain shard", () => {
    expect(getDockedSnapshot(dimension, location)).toBeUndefined();
    expect(deleteDockedSnapshot(dimension, location)).toBeUndefined();
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
    expect(setDockedSnapshot(dimension, location, snapshot)).toBeUndefined();
    expect(deleteDockedSnapshot(dimension, location)).toEqual(snapshot);
    expect(raw()).toBeUndefined();
  });

  it("keeps V2 metadata and unrelated entries across a targeted update/delete", () => {
    const neighbor = { ...snapshot, instanceId: "neighbor-B", charges: 1 };
    writeRaw(JSON.stringify(shard({ [key]: snapshot, "3,64,-3": neighbor })));
    expect(getDockedSnapshot(dimension, location)).toEqual(snapshot);
    expect(setDockedSnapshot(dimension, location, { ...snapshot, cosmeticId: "classic" })).toEqual(snapshot);
    expect(JSON.parse(raw() as string).entries["3,64,-3"]).toEqual(neighbor);
    expect(deleteDockedSnapshot(dimension, location)?.instanceId).toBe(snapshot.instanceId);
    expect(JSON.parse(raw() as string).entries).toEqual({ "3,64,-3": neighbor });
  });

  it.each([
    { opaque: { payload: "must survive", flags: [true, null, 2] } },
    { ...snapshot, schemaVersion: 99 },
    { ...snapshot, charges: 99, customProperties: { alien: { nested: "data" } } },
    null,
    ["foreign", { payload: 42 }],
  ])("preserves opaque neighbor %j and root fields without interpreting them", (neighbor) => {
    const rootFields = { extra: { schema: 17, data: [1, "two", null] }, label: "Private metadata" };
    const value = { ...rootFields, ...shard({ [key]: snapshot, "3,64,-3": neighbor, "foreign-key": neighbor }) };
    writeRaw(JSON.stringify(value));
    expect(getDockedSnapshot(dimension, location)).toEqual(snapshot);
    setDockedSnapshot(dimension, location, { ...snapshot, cosmeticId: "classic" });
    expect(JSON.parse(raw() as string)).toEqual({ ...value, entries: { ...value.entries, [key]: { ...snapshot, cosmeticId: "classic" } } });
    deleteDockedSnapshot(dimension, location);
    expect(JSON.parse(raw() as string)).toEqual({ ...rootFields, ...shard({ "3,64,-3": neighbor, "foreign-key": neighbor }) });
  });

  it("retains root metadata when the last item is deleted", () => {
    writeRaw(JSON.stringify({ ...shard(), extra: { retained: true } }));
    deleteDockedSnapshot(dimension, location);
    expect(JSON.parse(raw() as string)).toEqual({ ...shard({}), extra: { retained: true } });
  });

  it("accepts legacy V1 at the target without changing bytes on read", () => {
    const { charges: _charges, ...legacy } = { ...snapshot, schemaVersion: 1 };
    const original = JSON.stringify(shard({ [key]: legacy }));
    writeRaw(original);
    expect(getDockedSnapshot(dimension, location)).toEqual({ ...snapshot, charges: 0 });
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
    setDockedSnapshot(dimension, location, { ...snapshot, charges: 0 });
    expect(getDockedSnapshot(dimension, location)).toEqual({ ...snapshot, charges: 0 });
  });

  it("never migrates a legacy neighbor during a target update or deletion", () => {
    const { charges: _charges, ...legacy } = { ...snapshot, schemaVersion: 1, instanceId: "legacy-neighbor" };
    writeRaw(JSON.stringify(shard({ [key]: snapshot, "3,64,-3": legacy })));
    setDockedSnapshot(dimension, location, { ...snapshot, cosmeticId: "classic" });
    expect(JSON.parse(raw() as string).entries["3,64,-3"]).toEqual(legacy);
    deleteDockedSnapshot(dimension, location);
    expect(JSON.parse(raw() as string).entries).toEqual({ "3,64,-3": legacy });
  });

  it("accepts whitespace and property order and does not rewrite on read or absent deletion", () => {
    const reordered = Object.fromEntries(Object.entries(snapshot).reverse());
    const original = ` \n${JSON.stringify({ entries: { [key]: reordered }, schemaVersion: 1 }, null, 2)}\n`;
    writeRaw(original);
    expect(getDockedSnapshot(dimension, location)).toEqual(snapshot);
    expect(deleteDockedSnapshot(dimension, { ...location, x: 3 })).toBeUndefined();
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
    setDockedSnapshot(dimension, location, { ...snapshot, charges: 2 });
    expect(getDockedSnapshot(dimension, location)?.charges).toBe(2);
  });

  it.each([
    "unknown-item-field", "invalid-custom-property", "invalid-charges", "legacy-nonzero-charges",
    "vector-extra-field", "future-item", "null-item", "missing-charges", "invalid-name",
    "reserved:charges", "reserved:schema_version", "reserved:instance_id", "reserved:cosmetic_id", "reserved:spray_profile_id",
  ])("refuses invalid target %s without altering original property bytes", (kind) => {
    const value = shard();
    if (kind === "unknown-item-field") value.entries[key] = { ...snapshot, opaque: "must survive" };
    if (kind === "invalid-custom-property") value.entries[key] = { ...snapshot, customProperties: { unknown: { arbitrary: true } } };
    if (kind === "vector-extra-field") value.entries[key] = { ...snapshot, customProperties: { vector: { kind: "vector3", x: 1, y: 2, z: 3, opaque: "must survive" } } };
    if (kind.startsWith("reserved:")) value.entries[key] = { ...snapshot, customProperties: { [`aspergillum:${kind.slice("reserved:".length)}`]: "must survive" } };
    if (kind === "invalid-charges") value.entries[key] = { ...snapshot, charges: 99 };
    if (kind === "legacy-nonzero-charges") value.entries[key] = { ...snapshot, schemaVersion: 1 };
    if (kind === "future-item") value.entries[key] = { ...snapshot, schemaVersion: 99 };
    if (kind === "null-item") value.entries[key] = null;
    if (kind === "missing-charges") { const { charges: _charges, ...item } = snapshot; value.entries[key] = item; }
    if (kind === "invalid-name") value.entries[key] = { ...snapshot, nameTag: "x".repeat(256) };
    const original = JSON.stringify(value);
    writeRaw(original);
    expect(() => getDockedSnapshot(dimension, location)).toThrow();
    expect(() => setDockedSnapshot(dimension, location, snapshot)).toThrow();
    expect(() => deleteDockedSnapshot(dimension, location)).toThrow();
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });

  it.each([null, [], "text", 5, {}, { schemaVersion: 99, entries: {} }, { schemaVersion: 1, entries: [] }, { schemaVersion: 1, entries: null }])("refuses invalid root %j without mutation", (value) => {
    const original = JSON.stringify(value);
    writeRaw(original);
    expect(() => getDockedSnapshot(dimension, location)).toThrow();
    expect(() => setDockedSnapshot(dimension, location, snapshot)).toThrow();
    expect(() => deleteDockedSnapshot(dimension, location)).toThrow();
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });

  it("refuses malformed JSON and nonstring storage", () => {
    for (const value of ["{", 25, true]) {
      world.setDynamicProperty(propertyId, value);
      world.setDynamicProperty.mockClear();
      expect(() => setDockedSnapshot(dimension, location, snapshot)).toThrow();
      expect(raw()).toBe(value);
      expect(world.setDynamicProperty).not.toHaveBeenCalled();
    }
  });

  it("validates the new target before its first write", () => {
    for (const invalid of [{ ...snapshot, charges: 99 }, { ...snapshot, customProperties: { opaque: {} } }, { ...snapshot, extra: true }]) {
      expect(() => setDockedSnapshot(dimension, location, invalid as DockedAspergillumSnapshot)).toThrow();
      expect(raw()).toBeUndefined();
      expect(world.setDynamicProperty).not.toHaveBeenCalled();
    }
  });

  it("does not rewrite an out-of-range neighbor number as null", () => {
    const original = JSON.stringify(shard()).replace('"entries":{', '"entries":{"foreign":1e400,');
    writeRaw(original);
    expect(getDockedSnapshot(dimension, location)).toEqual(snapshot);
    expect(() => setDockedSnapshot(dimension, location, snapshot)).toThrow(/number/);
    expect(() => deleteDockedSnapshot(dimension, location)).toThrow(/number/);
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });

  it("refuses an oversized update before mutation, including multibyte text", () => {
    const original = JSON.stringify(shard());
    writeRaw(original);
    expect(() => setDockedSnapshot(dimension, location, {
      ...snapshot, customProperties: { text: "界".repeat(10_000) },
    })).toThrow(/exceeds/);
    expect(raw()).toBe(original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
});
