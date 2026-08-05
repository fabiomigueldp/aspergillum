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
  it("preserves every valid water and charge combination or rejects overflow", () => {
    for (let water = 0; water <= ASPERSORIUM_CAPACITY; water += 1) {
      for (let charges = 0; charges <= ASPERGILLUM_CAPACITY; charges += 1) {
        const result = resolveDocking(water, charges);
        if (water + charges > ASPERSORIUM_CAPACITY) {
          expect(result).toEqual({ allowed: false, nextWater: water, returnedCharges: 0, reason: "overflow" });
        } else {
          expect(result).toEqual({ allowed: true, nextWater: water + charges, returnedCharges: charges });
        }
      }
    }
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

  it("sanitizes snapshots and custom properties", () => {
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
    expect(shard.entries["1,2,3"]?.customProperties).toEqual({
      "third.party:flag": true,
      "third.party:vector": { kind: "vector3", x: 1, y: 2, z: 3 },
    });
  });
});
