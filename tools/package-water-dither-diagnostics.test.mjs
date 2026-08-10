import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyUniformAlphaTest,
  buildCoverageMask,
  buildDispersedHoleOrder,
  buildWaterTexture,
  materialMethods,
  renderMethod,
  simplifyWaterGeometry,
  variants,
} from "./package-water-dither-diagnostics.mjs";

const root = path.resolve(import.meta.dirname, "..");

function blockFixture() {
  return {
    "minecraft:block": {
      components: {
        "minecraft:material_instances": {
          "*": { texture: "metal", render_method: "opaque" },
          water: { texture: "water", render_method: "blend" },
        },
      },
      permutations: [
        {
          components: {
            "minecraft:material_instances": {
              "*": { texture: "variant", render_method: "opaque" },
              water: { texture: "water", render_method: "blend" },
            },
          },
        },
      ],
    },
  };
}

describe("water-dither diagnostic packaging", () => {
  it("uses monotonic pack revisions after the 1.1.7 release", () => {
    expect(variants.map((variant) => variant.label)).toEqual(["1.1.8a", "1.1.8b", "1.1.8c"]);
    expect(variants.map((variant) => variant.version)).toEqual([[1, 1, 11], [1, 1, 12], [1, 1, 13]]);
    expect(variants.map((variant) => variant.visiblePixels)).toEqual([192, 208, 224]);
  });

  it("applies one alpha-test method to structure, water and every cosmetic permutation", () => {
    const methods = materialMethods(applyUniformAlphaTest(blockFixture()));
    expect(methods).toEqual([
      { "*": renderMethod, water: renderMethod },
      { "*": renderMethod, water: renderMethod },
    ]);
  });

  it("creates nested, deterministic dispersed masks with only the intended coverage changing", () => {
    expect(buildDispersedHoleOrder()).toEqual(buildDispersedHoleOrder());
    expect(buildDispersedHoleOrder()).toHaveLength(64);
    const [mask75, mask81, mask88] = variants.map((variant) => buildCoverageMask(variant.coverage));
    expect(mask75.flat().filter(Boolean)).toHaveLength(192);
    expect(mask81.flat().filter(Boolean)).toHaveLength(208);
    expect(mask88.flat().filter(Boolean)).toHaveLength(224);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        if (!mask81[y][x]) expect(mask75[y][x]).toBe(false);
        if (!mask88[y][x]) expect(mask81[y][x]).toBe(false);
      }
    }
  });

  it("writes binary alpha while retaining valid cyan RGB under transparent texels", () => {
    const { image } = buildWaterTexture(variants[1].coverage);
    const alphas = [];
    let transparentRgbIsValid = true;
    for (let offset = 0; offset < image.data.length; offset += 4) {
      const alpha = image.data[offset + 3];
      alphas.push(alpha);
      if (alpha === 0 && image.data[offset] + image.data[offset + 1] + image.data[offset + 2] === 0) {
        transparentRgbIsValid = false;
      }
    }
    expect(new Set(alphas)).toEqual(new Set([0, 255]));
    expect(alphas.filter((alpha) => alpha === 255)).toHaveLength(832);
    expect(transparentRgbIsValid).toBe(true);
  });

  it("reduces every water level to one 16x16 top face without moving its surface", () => {
    const source = JSON.parse(fs.readFileSync(
      path.join(root, "packs", "resource", "models", "blocks", "aspersorium.geo.json"),
      "utf8",
    ));
    const output = simplifyWaterGeometry(source);
    const sourceGeometry = source["minecraft:geometry"][0];
    const outputGeometry = output["minecraft:geometry"][0];
    for (const name of ["water_low", "water_mid", "water_high", "water_full"]) {
      const before = sourceGeometry.bones.find((bone) => bone.name === name).cubes[0];
      const after = outputGeometry.bones.find((bone) => bone.name === name).cubes[0];
      expect(after.origin).toEqual(before.origin);
      expect(after.size).toEqual(before.size);
      expect(Object.keys(after.uv)).toEqual(["up"]);
      expect(after.uv.up).toEqual({ uv: [0, 0], uv_size: [16, 16], material_instance: "water" });
    }
  });
});
