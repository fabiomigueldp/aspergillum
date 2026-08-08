import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyMaterialProfile,
  buildExteriorShellModel,
  diagnosticUuid,
  materialMethods,
  variants,
} from "./package-render-diagnostics.mjs";

const root = path.resolve(import.meta.dirname, "..");
const canonicalModel = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src", "models", "aspergillum.model.json"), "utf8"),
);

function blockFixture() {
  return {
    "minecraft:block": {
      components: {
        "minecraft:material_instances": {
          "*": { texture: "metal", render_method: "blend" },
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

describe("render diagnostic packaging", () => {
  it("builds a 26-cube exterior shell with stable walls and isolated cap faces", () => {
    const diagnostic = buildExteriorShellModel(canonicalModel);
    const head = diagnostic["minecraft:geometry"][0].bones.find((bone) => bone.name === "sprinkler_head");
    expect(head.cubes).toHaveLength(26);

    const walls = head.cubes.slice(0, 6);
    const caps = head.cubes.slice(6);
    for (const [index, wall] of walls.entries()) {
      expect(wall.faces).toEqual(expect.arrayContaining(["north", "east", "south", "west"]));
      expect(wall.faces).toHaveLength(index === 0 || index === 5 ? 5 : 4);
    }
    expect(walls[0].faces).toContain("down");
    expect(walls[5].faces).toContain("up");
    expect(caps).toHaveLength(20);
    expect(caps.every((cap) => cap.faces.length === 1 && ["up", "down"].includes(cap.faces[0]))).toBe(true);
    expect(caps.every((cap) => cap.size.every((dimension) => dimension > 0))).toBe(true);
    expect(caps.filter((cap) => cap.faces[0] === "down")).toHaveLength(8);
    expect(caps.filter((cap) => cap.faces[0] === "up")).toHaveLength(12);
  });

  it("applies the three material profiles to base and cosmetic permutations", () => {
    expect(materialMethods(applyMaterialProfile(blockFixture(), "opaque"))).toEqual([
      { "*": "opaque", water: "opaque" },
      { "*": "opaque", water: "opaque" },
    ]);
    expect(materialMethods(applyMaterialProfile(blockFixture(), "split"))).toEqual([
      { "*": "opaque", water: "blend" },
      { "*": "opaque", water: "blend" },
    ]);
    expect(materialMethods(applyMaterialProfile(blockFixture(), "blend"))).toEqual([
      { "*": "blend", water: "blend" },
      { "*": "blend", water: "blend" },
    ]);
  });

  it("assigns monotonic numeric versions and deterministic unique UUIDs", () => {
    expect(variants.map((variant) => variant.version)).toEqual([[1, 1, 7], [1, 1, 8], [1, 1, 9]]);
    const uuids = variants.map((variant) => diagnosticUuid(`${variant.label}:behavior:header`));
    expect(new Set(uuids).size).toBe(3);
    expect(diagnosticUuid("1.1.7a:behavior:header")).toBe(uuids[0]);
    expect(uuids.every((uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid))).toBe(true);
  });
});
