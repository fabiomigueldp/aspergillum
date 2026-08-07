import { describe, expect, it } from "vitest";
import {
  dockedEntryKey,
  dockedShardPropertyId,
  parseDockedRegistryShard,
  resolveDocking,
} from "../../src/domain/docking";
import { ASPERGILLUM_CAPACITY } from "../../src/domain/aspergillum";
import { ASPERSORIUM_CAPACITY } from "../../src/domain/aspersorium-water";

describe("docking domain", () => {
  it("transfers what fits and preserves every remaining charge", () => {
    for (let water = 0; water <= ASPERSORIUM_CAPACITY; water += 1) {
      for (let charges = 0; charges <= ASPERGILLUM_CAPACITY; charges += 1) {
        const result = resolveDocking(water, charges);
        const transferredCharges = Math.min(charges, ASPERSORIUM_CAPACITY - water);
        expect(result).toEqual({
          nextWater: water + transferredCharges,
          transferredCharges,
          remainingCharges: charges - transferredCharges,
        });
        expect(result.nextWater + result.remainingCharges).toBe(water + charges);
      }
    }
  });

  it("handles full, partial, and zero transfer without rejecting docking", () => {
    expect(resolveDocking(12, 4)).toEqual({
      nextWater: 16,
      transferredCharges: 4,
      remainingCharges: 0,
    });
    expect(resolveDocking(14, 4)).toEqual({
      nextWater: 16,
      transferredCharges: 2,
      remainingCharges: 2,
    });
    expect(resolveDocking(16, 4)).toEqual({
      nextWater: 16,
      transferredCharges: 0,
      remainingCharges: 4,
    });
  });

  it("normalizes malformed water and charge inputs before conserving them", () => {
    expect(resolveDocking(-5, Number.NaN)).toEqual({
      nextWater: 0,
      transferredCharges: 0,
      remainingCharges: 0,
    });
    expect(resolveDocking(99, 99)).toEqual({
      nextWater: 16,
      transferredCharges: 0,
      remainingCharges: 4,
    });
  });

  it("uses deterministic chunk shards and block keys", () => {
    expect(dockedEntryKey({ x: -0.1, y: 64.9, z: 31.2 })).toBe("-1,64,31");
    expect(dockedShardPropertyId("minecraft:overworld", { x: -0.1, z: 31.2 }))
      .toBe("aspergillum:docked_minecraft_overworld_n1_p1");
    const longDimension = dockedShardPropertyId(`example:${"long_dimension_".repeat(5)}`, { x: 0, z: 0 });
    expect(longDimension.length).toBeLessThanOrEqual(64);
    expect(longDimension).toBe(dockedShardPropertyId(`example:${"long_dimension_".repeat(5)}`, { x: 0, z: 0 }));
  });

  it("fails closed for malformed registry data", () => {
    expect(parseDockedRegistryShard("not-json")).toEqual({ schemaVersion: 1, entries: {} });
    expect(parseDockedRegistryShard(JSON.stringify({ schemaVersion: 99, entries: {} })))
      .toEqual({ schemaVersion: 1, entries: {} });
  });

  it("migrates legacy snapshots to zero charges", () => {
    const shard = parseDockedRegistryShard(JSON.stringify({
      schemaVersion: 1,
      entries: {
        "1,2,3": {
          schemaVersion: 1,
          instanceId: "ag-test",
          nameTag: "Ceremonial",
          cosmeticId: "classic",
          sprayProfileId: "standard",
          customProperties: {
            "third.party:flag": true,
            "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 },
            "third.party:bad": { arbitrary: true },
          },
        },
        invalid: {},
      },
    }));
    expect(Object.keys(shard.entries)).toEqual(["1,2,3"]);
    expect(shard.entries["1,2,3"]).toEqual({
      schemaVersion: 2,
      instanceId: "ag-test",
      nameTag: "Ceremonial",
      charges: 0,
      cosmeticId: "classic",
      sprayProfileId: "standard",
      customProperties: {
        "third.party:flag": true,
        "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 },
      },
    });
  });

  it("sanitizes current snapshots, charges, and custom properties", () => {
    const shard = parseDockedRegistryShard(JSON.stringify({
      schemaVersion: 1,
      entries: {
        "1,2,3": {
          schemaVersion: 2,
          instanceId: "ag-test",
          charges: 99,
          cosmeticId: "classic",
          sprayProfileId: "standard",
          customProperties: {
            "third.party:flag": true,
            "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 },
            "third.party:bad": { arbitrary: true },
          },
        },
      },
    }));
    expect(shard.entries["1,2,3"]?.charges).toBe(ASPERGILLUM_CAPACITY);
    expect(shard.entries["1,2,3"]?.customProperties).toEqual({
      "third.party:flag": true,
      "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 },
    });
  });
});
