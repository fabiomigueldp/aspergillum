import { describe, expect, it } from "vitest";
import {
  diagnosticUuid,
  makeAspersoriumOpaque,
  removeBlockWaterBones,
  validateWaterVisualEntityDefinition,
  version,
} from "./package-entity-water-diagnostic.mjs";

function blockFixture() {
  return {
    "minecraft:block": {
      components: {
        "minecraft:geometry": {
          bone_visibility: {
            water_low: "low",
            water_mid: "mid",
            water_high: "high",
            water_full: "full",
            resting_aspergillum: "docked",
          },
        },
        "minecraft:material_instances": {
          "*": { texture: "metal", render_method: "opaque" },
          water: { texture: "water", render_method: "blend" },
        },
      },
      permutations: [
        {
          components: {
            "minecraft:material_instances": {
              "*": { texture: "variant", render_method: "blend" },
              water: { texture: "water", render_method: "blend" },
            },
          },
        },
      ],
    },
  };
}

describe("1.1.9c entity-water packaging", () => {
  it("makes every aspersorium block material uniformly opaque", () => {
    const output = makeAspersoriumOpaque(blockFixture());
    const block = output["minecraft:block"];
    expect(block.components["minecraft:material_instances"]).toEqual({
      "*": { texture: "metal", render_method: "opaque" },
    });
    expect(block.permutations[0].components["minecraft:material_instances"]).toEqual({
      "*": { texture: "variant", render_method: "opaque" },
    });
    expect(block.components["minecraft:geometry"].bone_visibility).toEqual({
      resting_aspergillum: "docked",
    });
    expect(block.components["minecraft:tick"]).toEqual({
      interval_range: [80, 120],
      looping: true,
    });
  });

  it("removes all four water bones without changing structural bones", () => {
    const fixture = {
      "minecraft:geometry": [
        {
          description: { identifier: "geometry.test" },
          bones: [
            { name: "root" },
            { name: "water_low" },
            { name: "water_mid" },
            { name: "water_high" },
            { name: "water_full" },
            { name: "resting_aspergillum" },
          ],
        },
      ],
    };
    expect(removeBlockWaterBones(fixture)["minecraft:geometry"][0].bones.map((bone) => bone.name)).toEqual([
      "root",
      "resting_aspergillum",
    ]);
  });

  it("uses the next monotonic pack revision and deterministic v5 UUIDs", () => {
    expect(version).toEqual([1, 1, 17]);
    const first = diagnosticUuid("1.1.9c:behavior:header");
    expect(diagnosticUuid("1.1.9c:behavior:header")).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("rejects a visual entity that the Script API cannot instantiate", () => {
    const definition = {
      "minecraft:entity": {
        description: {
          identifier: "aspergillum:aspersorium_water_visual",
          is_spawnable: false,
          is_summonable: true,
        },
        components: {
          "minecraft:persistent": {},
          "minecraft:cannot_be_attacked": {},
          "minecraft:physics": { has_gravity: false, has_collision: false },
          "minecraft:collision_box": { width: 0, height: 0 },
        },
      },
    };
    expect(() => validateWaterVisualEntityDefinition(definition)).not.toThrow();
    definition["minecraft:entity"].description.is_summonable = false;
    expect(() => validateWaterVisualEntityDefinition(definition)).toThrow(/Dimension\.spawnEntity/);
  });

  it("rejects the legacy pushable component removed from schema 1.26.10", () => {
    const definition = {
      "minecraft:entity": {
        description: {
          identifier: "aspergillum:aspersorium_water_visual",
          is_spawnable: false,
          is_summonable: true,
        },
        components: {
          "minecraft:persistent": {},
          "minecraft:cannot_be_attacked": {},
          "minecraft:physics": { has_gravity: false, has_collision: false },
          "minecraft:collision_box": { width: 0, height: 0 },
          "minecraft:pushable": { is_pushable: false, is_pushable_by_piston: false },
        },
      },
    };
    expect(() => validateWaterVisualEntityDefinition(definition)).toThrow(/minecraft:pushable/);
  });
});
