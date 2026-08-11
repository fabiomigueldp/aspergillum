import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const generatedRoot = process.env.ASPERGILLUM_GENERATED_ROOT
  ? path.resolve(root, process.env.ASPERGILLUM_GENERATED_ROOT)
  : root;
const aspergillumModelSource = process.env.ASPERGILLUM_MODEL_SOURCE
  ? path.resolve(root, process.env.ASPERGILLUM_MODEL_SOURCE)
  : path.join(root, "assets-src/models/aspergillum.model.json");
const packIconSource = path.join(root, "assets-src/branding/aspergillum-cover-256.png");
const retiredGeneratedAssets = [
  "packs/resource/textures/entity/thurible.png",
  "packs/resource/textures/entity/thurible_normal.png",
  "packs/resource/textures/entity/thurible_mer.png",
  "packs/resource/textures/items/thurible.png",
  "packs/resource/textures/particle/incense_smoke.png",
  "packs/resource/textures/particle/incense_veil.png",
];

for (const [label, candidate] of [
  ["generated output", generatedRoot],
  ["aspergillum model source", aspergillumModelSource],
]) {
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to use ${label} outside the workspace: ${candidate}`);
  }
}

function png(width, height, painter) {
  const image = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = painter(x, y);
      const offset = (width * y + x) << 2;
      image.data[offset] = r;
      image.data[offset + 1] = g;
      image.data[offset + 2] = b;
      image.data[offset + 3] = a;
    }
  }
  return image;
}

function write(relative, image) {
  const destination = path.join(generatedRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, PNG.sync.write(image, { colorType: 6 }));
}

function writeJson(relative, value) {
  const destination = path.join(generatedRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hash(x, y, seed = 0) {
  let value = Math.imul(x + seed * 31, 374761393) + Math.imul(y + seed * 17, 668265263);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function fillRect(image, x0, y0, width, height, color) {
  for (let y = Math.max(0, y0); y < Math.min(image.height, y0 + height); y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(image.width, x0 + width); x += 1) {
      const offset = (image.width * y + x) << 2;
      const value = typeof color === "function" ? color(x, y) : color;
      image.data[offset] = value[0];
      image.data[offset + 1] = value[1];
      image.data[offset + 2] = value[2];
      image.data[offset + 3] = value[3] ?? 255;
    }
  }
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (image.width * y + x) << 2;
  for (let channel = 0; channel < 4; channel += 1) image.data[offset + channel] = color[channel] ?? 255;
}

function pasteImage(destination, source, offsetX, offsetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceOffset = (source.width * y + x) << 2;
      setPixel(destination, offsetX + x, offsetY + y, [
        source.data[sourceOffset],
        source.data[sourceOffset + 1],
        source.data[sourceOffset + 2],
        source.data[sourceOffset + 3],
      ]);
    }
  }
}

const FACE_NAMES = ["north", "east", "south", "west", "up", "down"];
const UV_PADDING = 2;
const ENTITY_TEXELS_PER_UNIT = 2;
const ASPERSORIUM_ATLAS_SIZE = 256;
const DOCKED_ATLAS_OFFSET = [128, 0];
const DOCKED_MODEL_TRANSLATION = [6, -17, -1];
const SACRISTAN_TABLE_ATLAS_SIZE = 256;
const TABLE_ITEM_ATLAS_OFFSET = [128, 0];
const TABLE_ITEM_MODEL_TRANSLATION = [6, -12.8, -1];
const TABLE_ITEM_MODEL_SCALE = 0.72;
const ASPERSORIUM_WATER_BONES = new Set(["water_low", "water_mid", "water_high", "water_full"]);
const customizationCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/customization/catalog.json"), "utf8"),
);

function cosmeticTextureSuffix(cosmetic) {
  return cosmetic.id === "classic" ? "" : `_${cosmetic.id}`;
}

function cosmeticItemIdentifier(cosmetic) {
  return cosmetic.id === "classic"
    ? "aspergillum:aspergillum"
    : `aspergillum:aspergillum_${cosmetic.id}`;
}

function opaqueMaterialInstances(texture) {
  return {
    "*": { texture, render_method: "opaque" },
  };
}

for (const relative of retiredGeneratedAssets) {
  const target = path.resolve(generatedRoot, relative);
  if (target !== generatedRoot && !target.startsWith(`${generatedRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove retired generated asset outside the output root: ${target}`);
  }
  fs.rmSync(target, { force: true });
}

function faceTexelSize(size, faceName, texelsPerUnit = 1) {
  const [sizeX, sizeY, sizeZ] = size;
  const dimensions = faceName === "east" || faceName === "west"
    ? [sizeZ, sizeY]
    : faceName === "north" || faceName === "south"
      ? [sizeX, sizeY]
      : [sizeX, sizeZ];
  return dimensions.map((dimension) => Math.max(1, Math.ceil(dimension * texelsPerUnit)));
}

function selectedFaceNames(cube, cubeName) {
  if (cube.faces === undefined) return FACE_NAMES;
  if (!Array.isArray(cube.faces) || cube.faces.length === 0) {
    throw new Error(`Authored cube ${cubeName} requires at least one rendered face`);
  }
  const uniqueFaces = new Set(cube.faces);
  if (uniqueFaces.size !== cube.faces.length || cube.faces.some((faceName) => !FACE_NAMES.includes(faceName))) {
    throw new Error(`Authored cube ${cubeName} contains an invalid or duplicate face mask`);
  }
  return FACE_NAMES.filter((faceName) => uniqueFaces.has(faceName));
}

function buildEntityGeometry() {
  const geometry = JSON.parse(fs.readFileSync(aspergillumModelSource, "utf8"));
  const output = structuredClone(geometry);
  const description = output["minecraft:geometry"]?.[0]?.description;
  const textureWidth = description?.texture_width ?? 64;
  const textureHeight = description?.texture_height ?? 64;
  const regions = [];
  let cursorX = UV_PADDING;
  let cursorY = UV_PADDING;
  let rowHeight = 0;

  for (const bone of output["minecraft:geometry"]?.[0]?.bones ?? []) {
    for (const [cubeIndex, cube] of (bone.cubes ?? []).entries()) {
      const cubeName = cube.name ?? `${bone.name}_${cubeIndex + 1}`;
      const surface = cube.surface;
      if (!surface) throw new Error(`Missing surface for ${cubeName}`);
      const faceNames = selectedFaceNames(cube, cubeName);
      delete cube.name;
      delete cube.surface;
      delete cube.faces;
      cube.uv = {};

      for (const faceName of faceNames) {
        const [width, height] = faceTexelSize(cube.size, faceName, ENTITY_TEXELS_PER_UNIT);
        const packedWidth = width + UV_PADDING * 2;
        const packedHeight = height + UV_PADDING * 2;
        if (cursorX + packedWidth > textureWidth) {
          cursorX = UV_PADDING;
          cursorY += rowHeight;
          rowHeight = 0;
        }
        if (cursorY + packedHeight > textureHeight) {
          throw new Error(`Aspergillum UV atlas overflow at ${cubeName}.${faceName}`);
        }

        const uv = [cursorX + UV_PADDING, cursorY + UV_PADDING];
        cube.uv[faceName] = { uv, uv_size: [width, height] };
        regions.push({
          boneName: bone.name,
          cubeName,
          cubeIndex,
          faceName,
          surface,
          uv,
          width,
          height,
          seed: regions.length + 1,
        });
        cursorX += packedWidth;
        rowHeight = Math.max(rowHeight, packedHeight);
      }
    }
  }

  return { geometry: output, regions, textureWidth, textureHeight };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shadeColor(color, amount) {
  return [
    clampByte(color[0] + amount),
    clampByte(color[1] + amount),
    clampByte(color[2] + amount),
    color[3] ?? 255,
  ];
}

function isPerforation(region, x, y) {
  if (region.surface !== "perforated_silver" || region.width < 3 || region.height < 2) return false;
  const horizontalFace = region.faceName === "up" || region.faceName === "down";
  const border = x === 0 || y === 0 || x === region.width - 1 || y === region.height - 1;
  if (border) return false;
  if (horizontalFace) {
    const xPhase = region.seed % 2;
    const yPhase = Math.floor(region.seed / 2) % 2;
    return (x + xPhase) % 3 === 1 && (y + yPhase) % 3 === 1;
  }
  if (region.height < 5) return false;
  const apertureRow = y === 1 || y === region.height - 2;
  return apertureRow && (x + region.seed) % 3 === 1;
}

function albedoPixel(region, x, y, cosmetic = customizationCatalog.cosmetics[0]) {
  const noise = Math.round((hash(x, y, region.seed) - 0.5) * 8);
  const topOrLeft = x === 0 || y === 0;
  const bottomOrRight = x === region.width - 1 || y === region.height - 1;
  const bevel = topOrLeft ? 12 : bottomOrRight ? -11 : 0;
  const faceTone = {
    up: 12,
    north: 4,
    west: 1,
    east: -3,
    south: -6,
    down: -14,
  }[region.faceName] ?? 0;

  if (region.surface === "leather") {
    const wrapBand = Math.floor((y + Math.floor(x / 2)) / 2) % 2;
    const seam = (x + y + region.seed) % Math.max(4, region.width + 1) === 0;
    const gripPalette = {
      chestnut: [[105, 66, 39, 255], [66, 39, 25, 255]],
      oxblood: [[116, 32, 45, 255], [67, 18, 28, 255]],
      black: [[51, 54, 53, 255], [18, 20, 20, 255]],
      ivory: [[221, 207, 169, 255], [168, 151, 113, 255]],
    }[cosmetic.grip] ?? [[105, 66, 39, 255], [66, 39, 25, 255]];
    const base = gripPalette[wrapBand];
    return shadeColor(base, Math.round(noise * 0.4) + Math.round(bevel * 0.25) + (seam ? -12 : 0));
  }
  if (region.surface === "gold") {
    const bandHighlight = y === Math.floor(region.height / 2) ? 9 : 0;
    const goldBase = {
      silver: [180, 127, 36, 255],
      antique: [139, 103, 48, 255],
      gilded: [208, 157, 53, 255],
      bronze: [151, 94, 42, 255],
    }[cosmetic.metal] ?? [180, 127, 36, 255];
    return shadeColor(goldBase, noise + bevel + faceTone + bandHighlight);
  }
  if (isPerforation(region, x, y)) {
    return [24, 29, 30, 255];
  }
  const equatorBand = region.surface === "perforated_silver"
    && !["up", "down"].includes(region.faceName)
    && region.height >= 5
    && y === Math.floor(region.height / 2)
    ? 8
    : 0;
  const silverBase = {
    silver: [169, 176, 173, 255],
    antique: [96, 111, 107, 255],
    gilded: [190, 154, 75, 255],
    bronze: [151, 91, 49, 255],
  }[cosmetic.metal] ?? [158, 162, 159, 255];
  return shadeColor(silverBase, noise + bevel + faceTone + equatorBand);
}

function normalPixel(region, x, y) {
  if (isPerforation(region, x, y)) return [128, 128, 205, 255];
  if (region.surface === "leather" && (y + Math.floor(x / 2)) % 4 === 0) return [128, 121, 244, 255];
  const variation = Math.round((hash(x, y, region.seed + 100) - 0.5) * 4);
  return [128 + variation, 128 - variation, 250, 255];
}

function mersPixel(region, x, y, cosmetic = customizationCatalog.cosmetics[0]) {
  if (region.surface === "leather") return [12, 0, cosmetic.grip === "ivory" ? 178 : 226, 255];
  if (region.surface === "gold") {
    const roughness = { silver: 88, antique: 142, gilded: 74, bronze: 126 }[cosmetic.metal] ?? 88;
    return [236, 0, roughness, 255];
  }
  if (isPerforation(region, x, y)) {
    const roughness = cosmetic.metal === "antique" ? 224 : cosmetic.metal === "bronze" ? 214 : 205;
    return [38, 0, roughness, 255];
  }
  const roughnessBase = {
    silver: 102,
    antique: 156,
    gilded: 88,
    bronze: 132,
  }[cosmetic.metal] ?? 102;
  const roughness = roughnessBase + Math.round(hash(x, y, region.seed + 200) * 18);
  return [226, 0, roughness, 255];
}

function paintAtlasRegion(image, region, painter) {
  const [uvX, uvY] = region.uv;
  for (let y = -UV_PADDING; y < region.height + UV_PADDING; y += 1) {
    for (let x = -UV_PADDING; x < region.width + UV_PADDING; x += 1) {
      const sourceX = Math.max(0, Math.min(region.width - 1, x));
      const sourceY = Math.max(0, Math.min(region.height - 1, y));
      setPixel(image, uvX + x, uvY + y, painter(region, sourceX, sourceY));
    }
  }
}

const entityModel = buildEntityGeometry();
writeJson("packs/resource/models/entity/aspergillum.geo.json", entityModel.geometry);

const entityTextures = new Map();
for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  const entity = png(entityModel.textureWidth, entityModel.textureHeight, () => [135, 137, 132, 255]);
  const entityNormal = png(entityModel.textureWidth, entityModel.textureHeight, () => [128, 128, 255, 255]);
  const entityMer = png(entityModel.textureWidth, entityModel.textureHeight, () => [0, 0, 255, 255]);
  for (const region of entityModel.regions) {
    paintAtlasRegion(entity, region, (current, x, y) => albedoPixel(current, x, y, cosmetic));
    paintAtlasRegion(entityNormal, region, normalPixel);
    paintAtlasRegion(entityMer, region, (current, x, y) => mersPixel(current, x, y, cosmetic));
  }
  write(`packs/resource/textures/entity/aspergillum${suffix}.png`, entity);
  write(`packs/resource/textures/entity/aspergillum${suffix}_normal.png`, entityNormal);
  write(`packs/resource/textures/entity/aspergillum${suffix}_mer.png`, entityMer);
  entityTextures.set(cosmetic.id, { entity, entityNormal, entityMer, suffix });
  writeJson(`packs/resource/textures/entity/aspergillum${suffix}.texture_set.json`, {
    format_version: "1.16.100",
    "minecraft:texture_set": {
      color: `aspergillum${suffix}`,
      metalness_emissive_roughness: `aspergillum${suffix}_mer`,
      normal: `aspergillum${suffix}_normal`,
    },
  });
}

const { entity, entityNormal, entityMer } = entityTextures.get("classic");

function makeAspersoriumAlbedo() {
  return png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => {
    const hammered = Math.round((hash(Math.floor(x / 3), Math.floor(y / 3), 11) - 0.5) * 18);
    const grain = Math.round((hash(x, y, 37) - 0.5) * 6);
    const patina = hash(Math.floor(x / 8), Math.floor(y / 8), 71) > 0.87 ? -8 : 0;
    return [143 + hammered + grain + patina, 147 + hammered + grain + Math.round(patina * 0.55), 145 + hammered + grain, 255];
  });
}

function makeAspersoriumNormal() {
  return png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => {
    const broad = Math.round((hash(Math.floor(x / 3), Math.floor(y / 3), 19) - 0.5) * 8);
    const grain = Math.round((hash(x, y, 23) - 0.5) * 3);
    return [128 + broad + grain, 128 - broad + grain, 247, 255];
  });
}

function makeAspersoriumMer() {
  return png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => [
    218,
    0,
    132 + Math.round(hash(Math.floor(x / 2), Math.floor(y / 2), 4) * 26),
    255,
  ]);
}

for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  const variant = entityTextures.get(cosmetic.id);
  const block = makeAspersoriumAlbedo();
  const blockNormal = makeAspersoriumNormal();
  const blockMer = makeAspersoriumMer();
  pasteImage(block, variant.entity, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
  pasteImage(blockNormal, variant.entityNormal, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
  pasteImage(blockMer, variant.entityMer, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
  write(`packs/resource/textures/blocks/aspersorium${suffix}.png`, block);
  write(`packs/resource/textures/blocks/aspersorium${suffix}_normal.png`, blockNormal);
  write(`packs/resource/textures/blocks/aspersorium${suffix}_mer.png`, blockMer);
  writeJson(`packs/resource/textures/blocks/aspersorium${suffix}.texture_set.json`, {
    format_version: "1.16.100",
    "minecraft:texture_set": {
      color: `aspersorium${suffix}`,
      metalness_emissive_roughness: `aspersorium${suffix}_mer`,
      normal: `aspersorium${suffix}_normal`,
    },
  });
}

const water = png(32, 32, (x, y) => {
  const wave = Math.sin((x + y) * 0.7) * 9 + (hash(x, y, 31) - 0.5) * 10;
  return [56 + wave, 151 + wave, 190 + wave, 178];
});
for (let i = 0; i < 32; i += 1) setPixel(water, i, (i * 3 + 5) % 32, [164, 229, 242, 210]);
write("packs/resource/textures/blocks/holy_water.png", water);
write("packs/resource/textures/entity/aspersorium_water_visual.png", water);

const particle = png(16, 16, (x, y) => {
  const dx = (x - 7.5) / 7.5;
  const dy = (y - 7.5) / 7.5;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 1) return [0, 0, 0, 0];
  const alpha = Math.round(240 * (1 - distance ** 1.7));
  // Keep the source sprite chromatically neutral. The particle definitions own
  // the final water palette, avoiding an accidental double-cyan multiplication.
  return [245, 249, 255, alpha];
});
write("packs/resource/textures/particle/holy_water.png", particle);

const outline = [34, 39, 39, 255];
function makeItemIcon(cosmetic) {
  const item = png(32, 32, () => [0, 0, 0, 0]);
  const metals = {
    silver: { dark: [96, 107, 105, 255], base: [181, 190, 186, 255], shine: [235, 241, 230, 255] },
    antique: { dark: [48, 65, 63, 255], base: [105, 124, 119, 255], shine: [165, 180, 166, 255] },
    gilded: { dark: [103, 72, 29, 255], base: [195, 151, 63, 255], shine: [244, 220, 143, 255] },
    bronze: { dark: [79, 43, 25, 255], base: [156, 91, 48, 255], shine: [222, 154, 89, 255] },
  };
  const grips = {
    chestnut: { dark: [62, 34, 20, 255], base: [103, 61, 34, 255], light: [148, 94, 50, 255] },
    oxblood: { dark: [62, 13, 24, 255], base: [111, 27, 42, 255], light: [163, 55, 65, 255] },
    black: { dark: [16, 18, 18, 255], base: [43, 47, 46, 255], light: [82, 88, 83, 255] },
    ivory: { dark: [115, 101, 73, 255], base: [194, 178, 137, 255], light: [241, 228, 188, 255] },
  };
  const metal = metals[cosmetic.metal] ?? metals.silver;
  const leather = grips[cosmetic.grip] ?? grips.chestnut;
  for (let y = 12; y <= 29; y += 1) {
    const x = 9 + Math.floor((28 - y) * 0.32);
    const isGrip = y >= 20;
    setPixel(item, x - 2, y, outline);
    setPixel(item, x - 1, y, isGrip ? leather.dark : metal.dark);
    setPixel(item, x, y, isGrip ? leather.base : metal.base);
    setPixel(item, x + 1, y, isGrip ? (y % 3 === 1 ? leather.dark : leather.light) : metal.shine);
    setPixel(item, x + 2, y, outline);
  }
  for (let y = 2; y <= 15; y += 1) {
    for (let x = 9; x <= 24; x += 1) {
      const dx = (x - 16.5) / 7.8;
      const dy = (y - 8.5) / 7;
      if (dx * dx + dy * dy <= 1) {
        const edge = dx * dx + dy * dy > 0.75;
        const hole = !edge && ((x * 2 + y * 3) % 7) === 0;
        setPixel(item, x, y, edge ? outline : hole ? [25, 30, 30, 255] : (x + y) % 5 === 0 ? metal.shine : metal.base);
      }
    }
  }
  const ferrule = {
    silver: [190, 132, 38, 255],
    antique: [128, 91, 42, 255],
    gilded: [220, 169, 62, 255],
    bronze: [151, 89, 39, 255],
  }[cosmetic.metal] ?? [190, 132, 38, 255];
  fillRect(item, 9, 15, 7, 2, ferrule);
  fillRect(item, 8, 19, 6, 1, metal.shine);
  return item;
}

for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  write(`packs/resource/textures/items/aspergillum${suffix}.png`, makeItemIcon(cosmetic));
}

function publishPackIcon(relative) {
  if (!fs.existsSync(packIconSource)) {
    throw new Error(`Missing authoritative pack icon: ${path.relative(root, packIconSource)}`);
  }
  const source = fs.readFileSync(packIconSource);
  const image = PNG.sync.read(source);
  if (image.width !== 256 || image.height !== 256) {
    throw new Error(`Authoritative pack icon must be 256 × 256, got ${image.width} × ${image.height}`);
  }
  const destination = path.join(generatedRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, source);
}

publishPackIcon("packs/resource/pack_icon.png");
publishPackIcon("packs/behavior/pack_icon.png");

function offsetFaceUvs(uv, offset) {
  return Object.fromEntries(Object.entries(uv).map(([faceName, face]) => [
    faceName,
    {
      ...face,
      uv: [face.uv[0] + offset[0], face.uv[1] + offset[1]],
    },
  ]));
}

function buildDockedAspergillumCubes() {
  const heldBones = entityModel.geometry["minecraft:geometry"][0].bones;
  return heldBones
    .filter((bone) => bone.name === "handle" || bone.name === "sprinkler_head")
    .flatMap((bone) => bone.cubes ?? [])
    .map((cube) => ({
      origin: cube.origin.map((coordinate, axis) => coordinate + DOCKED_MODEL_TRANSLATION[axis]),
      size: [...cube.size],
      uv: offsetFaceUvs(cube.uv, DOCKED_ATLAS_OFFSET),
    }));
}

function buildPresentedAspergillumCubes(translation, atlasOffset, scale = 1) {
  const heldBones = entityModel.geometry["minecraft:geometry"][0].bones;
  const scaleAnchor = [-6, 29, 1];
  return heldBones
    .filter((bone) => bone.name === "handle" || bone.name === "sprinkler_head")
    .flatMap((bone) => bone.cubes ?? [])
    .map((cube) => ({
      origin: cube.origin.map(
        (coordinate, axis) => scaleAnchor[axis] + (coordinate - scaleAnchor[axis]) * scale + translation[axis],
      ),
      size: cube.size.map((dimension) => dimension * scale),
      uv: offsetFaceUvs(cube.uv, atlasOffset),
    }));
}

function buildSemanticBlockGeometry(sourceRelative, packingWidth, texelsPerUnit = 2) {
  const sourcePath = path.join(root, sourceRelative);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const output = structuredClone(source);
  const description = output["minecraft:geometry"]?.[0]?.description;
  const textureWidth = description?.texture_width ?? 256;
  const textureHeight = description?.texture_height ?? 256;
  const regions = [];
  let cursorX = UV_PADDING;
  let cursorY = UV_PADDING;
  let rowHeight = 0;

  for (const bone of output["minecraft:geometry"]?.[0]?.bones ?? []) {
    for (const [cubeIndex, cube] of (bone.cubes ?? []).entries()) {
      const cubeName = cube.name ?? `${bone.name}_${cubeIndex + 1}`;
      const surface = cube.surface;
      if (!surface) throw new Error(`Missing surface for ${cubeName}`);
      const faceNames = selectedFaceNames(cube, cubeName);
      delete cube.name;
      delete cube.surface;
      delete cube.faces;
      cube.uv = {};
      for (const faceName of faceNames) {
        const [width, height] = faceTexelSize(cube.size, faceName, texelsPerUnit);
        const packedWidth = width + UV_PADDING * 2;
        const packedHeight = height + UV_PADDING * 2;
        if (cursorX + packedWidth > packingWidth) {
          cursorX = UV_PADDING;
          cursorY += rowHeight;
          rowHeight = 0;
        }
        if (cursorY + packedHeight > textureHeight) {
          throw new Error(`Semantic block atlas overflow at ${cubeName}.${faceName}`);
        }
        const uv = [cursorX + UV_PADDING, cursorY + UV_PADDING];
        cube.uv[faceName] = { uv, uv_size: [width, height] };
        regions.push({ cubeName, faceName, surface, uv, width, height, seed: regions.length + 301 });
        cursorX += packedWidth;
        rowHeight = Math.max(rowHeight, packedHeight);
      }
    }
  }
  return { geometry: output, regions, textureWidth, textureHeight };
}

function tableAlbedoPixel(region, x, y) {
  const border = x === 0 || y === 0 || x === region.width - 1 || y === region.height - 1;
  const faceTone = { up: 10, north: 3, west: 0, east: -3, south: -6, down: -12 }[region.faceName] ?? 0;
  const noise = Math.round((hash(x, y, region.seed) - 0.5) * 8);
  if (region.surface === "velvet") {
    const thread = (x + y * 2 + region.seed) % 7 === 0 ? 5 : 0;
    return shadeColor([45, 78, 60, 255], noise + thread + faceTone * 0.35 - (border ? 3 : 0));
  }
  if (region.surface === "brass") {
    return shadeColor([151, 111, 49, 255], noise + faceTone + (border ? -8 : 4));
  }
  const light = region.surface === "wood_light";
  const grain = ((x + Math.floor(hash(x, y, region.seed + 19) * 3)) % 9 === 0) ? -10 : 0;
  const base = light ? [105, 70, 45, 255] : [69, 44, 32, 255];
  return shadeColor(base, noise + faceTone + grain + (border ? -7 : 0));
}

function tableNormalPixel(region, x, y) {
  if (region.surface === "velvet") {
    const variation = Math.round((hash(x, y, region.seed + 40) - 0.5) * 7);
    return [128 + variation, 128 - variation, 244, 255];
  }
  if (region.surface.startsWith("wood")) {
    const groove = x % 9 === 0 ? -9 : 0;
    return [128 + groove, 128, 247, 255];
  }
  return [128, 128, 250, 255];
}

function tableMerPixel(region, x, y) {
  if (region.surface === "brass") return [225, 0, 126 + Math.round(hash(x, y, region.seed) * 16), 255];
  if (region.surface === "velvet") return [0, 0, 238, 255];
  return [0, 0, region.surface === "wood_light" ? 190 : 210, 255];
}

const geometrySource = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/models/aspersorium.model.json"), "utf8"),
);
const baseGeometry = geometrySource["minecraft:geometry"][0];
const authoredWaterBones = baseGeometry.bones.filter((bone) => ASPERSORIUM_WATER_BONES.has(bone.name));
if (authoredWaterBones.length !== ASPERSORIUM_WATER_BONES.size) {
  throw new Error("Aspersorium geometry requires all four authored water bones");
}
const entityWaterBones = structuredClone(authoredWaterBones);
for (const bone of entityWaterBones) {
  for (const cube of bone.cubes ?? []) {
    for (const face of Object.values(cube.uv ?? {})) delete face.material_instance;
  }
}
writeJson("packs/resource/models/entity/aspersorium_water_visual.geo.json", {
  format_version: "1.16.0",
  "minecraft:geometry": [{
    description: {
      identifier: "geometry.aspergillum.aspersorium_water_visual",
      texture_width: 32,
      texture_height: 32,
      visible_bounds_width: 1.2,
      visible_bounds_height: 1.2,
      visible_bounds_offset: [0, 0.35, 0],
    },
    bones: [{ name: "root", pivot: [0, 0, 0] }, ...entityWaterBones],
  }],
});
baseGeometry.bones = baseGeometry.bones.filter((bone) => !ASPERSORIUM_WATER_BONES.has(bone.name));
const restingAspergillum = baseGeometry.bones.find((bone) => bone.name === "resting_aspergillum");
if (!restingAspergillum) throw new Error("Aspersorium geometry requires the resting_aspergillum bone");
restingAspergillum.cubes = buildDockedAspergillumCubes();
writeJson("packs/resource/models/blocks/aspersorium.geo.json", geometrySource);
const rotatedGeometries = Array.from({ length: 16 }, (_, rotationIndex) => {
  const geometry = structuredClone(baseGeometry);
  geometry.description.identifier = `geometry.aspergillum.aspersorium.rotation_${rotationIndex}`;
  const rootBone = geometry.bones.find((bone) => bone.name === "root");
  if (!rootBone) throw new Error("Aspersorium geometry requires a root bone");
  const angle = rotationIndex * 22.5;
  rootBone.rotation = [0, angle > 180 ? angle - 360 : angle, 0];
  return geometry;
});
writeJson("packs/resource/models/blocks/aspersorium.rotations.geo.json", {
  format_version: geometrySource.format_version,
  "minecraft:geometry": rotatedGeometries,
});

const tableModel = buildSemanticBlockGeometry(
  "assets-src/models/sacristan_table.model.json",
  TABLE_ITEM_ATLAS_OFFSET[0],
  1,
);
const tableGeometry = tableModel.geometry;
const tableRestingAspergillum = tableGeometry["minecraft:geometry"][0].bones.find(
  (bone) => bone.name === "resting_aspergillum",
);
if (!tableRestingAspergillum) throw new Error("Sacristan table geometry requires the resting_aspergillum bone");
tableRestingAspergillum.cubes = buildPresentedAspergillumCubes(
  TABLE_ITEM_MODEL_TRANSLATION,
  TABLE_ITEM_ATLAS_OFFSET,
  TABLE_ITEM_MODEL_SCALE,
);
writeJson("packs/resource/models/blocks/sacristan_table.geo.json", tableGeometry);
const tableRotatedGeometries = Array.from({ length: 16 }, (_, rotationIndex) => {
  const geometry = structuredClone(tableGeometry["minecraft:geometry"][0]);
  geometry.description.identifier = `geometry.aspergillum.sacristan_table.rotation_${rotationIndex}`;
  const rootBone = geometry.bones.find((bone) => bone.name === "root");
  if (!rootBone) throw new Error("Sacristan table geometry requires a root bone");
  const angle = rotationIndex * 22.5;
  rootBone.rotation = [0, angle > 180 ? angle - 360 : angle, 0];
  return geometry;
});
writeJson("packs/resource/models/blocks/sacristan_table.rotations.geo.json", {
  format_version: tableGeometry.format_version,
  "minecraft:geometry": tableRotatedGeometries,
});

for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  const variant = entityTextures.get(cosmetic.id);
  const table = png(SACRISTAN_TABLE_ATLAS_SIZE, SACRISTAN_TABLE_ATLAS_SIZE, () => [67, 44, 32, 255]);
  const tableNormal = png(SACRISTAN_TABLE_ATLAS_SIZE, SACRISTAN_TABLE_ATLAS_SIZE, () => [128, 128, 255, 255]);
  const tableMer = png(SACRISTAN_TABLE_ATLAS_SIZE, SACRISTAN_TABLE_ATLAS_SIZE, () => [0, 0, 220, 255]);
  for (const region of tableModel.regions) {
    paintAtlasRegion(table, region, tableAlbedoPixel);
    paintAtlasRegion(tableNormal, region, tableNormalPixel);
    paintAtlasRegion(tableMer, region, tableMerPixel);
  }
  pasteImage(table, variant.entity, TABLE_ITEM_ATLAS_OFFSET[0], TABLE_ITEM_ATLAS_OFFSET[1]);
  pasteImage(tableNormal, variant.entityNormal, TABLE_ITEM_ATLAS_OFFSET[0], TABLE_ITEM_ATLAS_OFFSET[1]);
  pasteImage(tableMer, variant.entityMer, TABLE_ITEM_ATLAS_OFFSET[0], TABLE_ITEM_ATLAS_OFFSET[1]);
  write(`packs/resource/textures/blocks/sacristan_table${suffix}.png`, table);
  write(`packs/resource/textures/blocks/sacristan_table${suffix}_normal.png`, tableNormal);
  write(`packs/resource/textures/blocks/sacristan_table${suffix}_mer.png`, tableMer);
  writeJson(`packs/resource/textures/blocks/sacristan_table${suffix}.texture_set.json`, {
    format_version: "1.16.100",
    "minecraft:texture_set": {
      color: `sacristan_table${suffix}`,
      metalness_emissive_roughness: `sacristan_table${suffix}_mer`,
      normal: `sacristan_table${suffix}_normal`,
    },
  });
}

const blockPath = path.join(generatedRoot, "packs/behavior/blocks/aspersorium.block.json");
const blockDefinition = JSON.parse(fs.readFileSync(blockPath, "utf8"));
const blockContent = blockDefinition["minecraft:block"];
delete blockContent.description.states["aspergillum:water_level"];
blockContent.description.states["aspergillum:water_base"] = [0, 9];
blockContent.description.states["aspergillum:water_offset"] = Array.from({ length: 9 }, (_, index) => index);
blockContent.description.states["aspergillum:cosmetic"] = customizationCatalog.cosmetics.map((cosmetic) => cosmetic.index);
blockContent.description.states["aspergillum:rotation"] = Array.from({ length: 16 }, (_, index) => index);
blockContent.components["minecraft:material_instances"] = opaqueMaterialInstances("aspersorium");
if (blockContent.description.traits) {
  delete blockContent.description.traits["minecraft:placement_direction"];
  if (Object.keys(blockContent.description.traits).length === 0) delete blockContent.description.traits;
}
const boneVisibility = blockContent.components["minecraft:geometry"].bone_visibility;
for (const boneName of ASPERSORIUM_WATER_BONES) delete boneVisibility[boneName];
blockContent.components["minecraft:geometry"].identifier = "geometry.aspergillum.aspersorium.rotation_0";
delete blockContent.components["minecraft:geometry"].n_way_visual_rotation;
blockContent.components["minecraft:tick"] = {
  interval_range: [80, 120],
  looping: true,
};
blockContent.permutations = blockContent.permutations.filter(
  (permutation) =>
    !permutation.condition.includes("minecraft:sixteen_way_rotation") &&
    !permutation.condition.includes("aspergillum:rotation") &&
    !permutation.condition.includes("aspergillum:cosmetic"),
);
for (const cosmetic of customizationCatalog.cosmetics.slice(1)) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  blockContent.permutations.push({
    condition: `q.block_state('aspergillum:cosmetic') == ${cosmetic.index}`,
    components: {
      "minecraft:material_instances": opaqueMaterialInstances(`aspersorium${suffix}`),
    },
  });
}
for (let rotationIndex = 1; rotationIndex < 16; rotationIndex += 1) {
  blockContent.permutations.push({
    condition: `q.block_state('aspergillum:rotation') == ${rotationIndex}`,
    components: {
      "minecraft:geometry": {
        identifier: `geometry.aspergillum.aspersorium.rotation_${rotationIndex}`,
        uv_lock: false,
        bone_visibility: boneVisibility,
      },
    },
  });
}
writeJson("packs/behavior/blocks/aspersorium.block.json", blockDefinition);

const tableBlockPath = path.join(generatedRoot, "packs/behavior/blocks/sacristan_table.block.json");
const tableBlockDefinition = JSON.parse(fs.readFileSync(tableBlockPath, "utf8"));
const tableBlockContent = tableBlockDefinition["minecraft:block"];
tableBlockContent.description.states["aspergillum:table_cosmetic"] = customizationCatalog.cosmetics.map(
  (cosmetic) => cosmetic.index,
);
tableBlockContent.description.states["aspergillum:table_rotation"] = Array.from(
  { length: 16 },
  (_, index) => index,
);
tableBlockContent.permutations = tableBlockContent.permutations.filter(
  (permutation) => !permutation.condition.includes("aspergillum:table_rotation")
    && !permutation.condition.includes("aspergillum:table_cosmetic"),
);
const tableBoneVisibility = tableBlockContent.components["minecraft:geometry"].bone_visibility;
tableBlockContent.components["minecraft:geometry"].identifier = "geometry.aspergillum.sacristan_table.rotation_0";
for (const cosmetic of customizationCatalog.cosmetics.slice(1)) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  tableBlockContent.permutations.push({
    condition: `q.block_state('aspergillum:table_cosmetic') == ${cosmetic.index}`,
    components: {
      "minecraft:material_instances": opaqueMaterialInstances(`sacristan_table${suffix}`),
    },
  });
}
for (let rotationIndex = 1; rotationIndex < 16; rotationIndex += 1) {
  tableBlockContent.permutations.push({
    condition: `q.block_state('aspergillum:table_rotation') == ${rotationIndex}`,
    components: {
      "minecraft:geometry": {
        identifier: `geometry.aspergillum.sacristan_table.rotation_${rotationIndex}`,
        uv_lock: false,
        bone_visibility: tableBoneVisibility,
      },
    },
  });
}
writeJson("packs/behavior/blocks/sacristan_table.block.json", tableBlockDefinition);

const baseItemDefinition = JSON.parse(
  fs.readFileSync(path.join(generatedRoot, "packs/behavior/items/aspergillum.item.json"), "utf8"),
);
const baseAttachableDefinition = JSON.parse(
  fs.readFileSync(path.join(generatedRoot, "packs/resource/attachables/aspergillum.attachable.json"), "utf8"),
);
for (const cosmetic of customizationCatalog.cosmetics.slice(1)) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  const identifier = cosmeticItemIdentifier(cosmetic);
  const itemDefinition = structuredClone(baseItemDefinition);
  itemDefinition["minecraft:item"].description.identifier = identifier;
  delete itemDefinition["minecraft:item"].description.menu_category;
  itemDefinition["minecraft:item"].components["minecraft:icon"].textures.default = `aspergillum${suffix}`;
  writeJson(`packs/behavior/items/aspergillum${suffix}.item.json`, itemDefinition);

  const attachableDefinition = structuredClone(baseAttachableDefinition);
  const description = attachableDefinition["minecraft:attachable"].description;
  description.identifier = identifier;
  description.item = { [identifier]: "q.is_owner_identifier_any('minecraft:player')" };
  description.textures.default = `textures/entity/aspergillum${suffix}`;
  writeJson(`packs/resource/attachables/aspergillum${suffix}.attachable.json`, attachableDefinition);
}

const itemTexturePath = path.join(generatedRoot, "packs/resource/textures/item_texture.json");
const itemTextureDefinition = JSON.parse(fs.readFileSync(itemTexturePath, "utf8"));
for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  itemTextureDefinition.texture_data[`aspergillum${suffix}`] = {
    textures: [`textures/items/aspergillum${suffix}`],
  };
}
itemTextureDefinition.texture_data.sacristan_table = {
  textures: ["textures/blocks/sacristan_table"],
};
writeJson("packs/resource/textures/item_texture.json", itemTextureDefinition);

const terrainTexturePath = path.join(generatedRoot, "packs/resource/textures/terrain_texture.json");
const terrainTextureDefinition = JSON.parse(fs.readFileSync(terrainTexturePath, "utf8"));
for (const cosmetic of customizationCatalog.cosmetics) {
  const suffix = cosmeticTextureSuffix(cosmetic);
  terrainTextureDefinition.texture_data[`aspersorium${suffix}`] = {
    textures: [`textures/blocks/aspersorium${suffix}`],
  };
  terrainTextureDefinition.texture_data[`sacristan_table${suffix}`] = {
    textures: [`textures/blocks/sacristan_table${suffix}`],
  };
}
writeJson("packs/resource/textures/terrain_texture.json", terrainTextureDefinition);

const blocksPath = path.join(generatedRoot, "packs/resource/blocks.json");
const blocksDefinition = JSON.parse(fs.readFileSync(blocksPath, "utf8"));
blocksDefinition["aspergillum:sacristan_table"] = { sound: "wood" };
writeJson("packs/resource/blocks.json", blocksDefinition);

const audioCatalog = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/audio/audio-catalog.json"), "utf8"),
);
const soundDefinitions = {};
for (const family of audioCatalog.families) {
  family.paths.forEach((soundPath, index) => {
    const variantId = `${family.id}.v${String(index + 1).padStart(2, "0")}`;
    soundDefinitions[variantId] = {
      category: family.category,
      min_distance: family.minDistance,
      max_distance: family.maxDistance,
      sounds: [{ name: soundPath, volume: family.volume, pitch: 1 }],
    };
  });
  soundDefinitions[family.id] = {
    category: family.category,
    min_distance: family.minDistance,
    max_distance: family.maxDistance,
    sounds: family.paths.map((name) => ({ name, volume: family.volume, pitch: 1, weight: 1 })),
  };
}
writeJson("packs/resource/sounds/sound_definitions.json", {
  format_version: audioCatalog.soundDefinitionsFormatVersion,
  sound_definitions: soundDefinitions,
});
