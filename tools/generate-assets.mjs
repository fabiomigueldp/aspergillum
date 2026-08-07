import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");

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
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, PNG.sync.write(image, { colorType: 6 }));
}

function writeJson(relative, value) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hash(x, y, seed = 0) {
  let value = Math.imul(x + seed * 31, 374761393) + Math.imul(y + seed * 17, 668265263);
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function silver(x, y, seed = 1) {
  const grain = Math.round((hash(x, y, seed) - 0.5) * 24);
  const band = ((x + y) % 13 === 0 ? 8 : 0);
  return [156 + grain + band, 158 + grain + band, 153 + grain + band, 255];
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

function faceTexelSize(size, faceName, texelsPerUnit = 1) {
  const [sizeX, sizeY, sizeZ] = size;
  const dimensions = faceName === "east" || faceName === "west"
    ? [sizeZ, sizeY]
    : faceName === "north" || faceName === "south"
      ? [sizeX, sizeY]
      : [sizeX, sizeZ];
  return dimensions.map((dimension) => Math.max(1, Math.ceil(dimension * texelsPerUnit)));
}

function buildEntityGeometry() {
  const sourcePath = path.join(root, "assets-src/models/aspergillum.model.json");
  const geometry = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
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
      delete cube.name;
      delete cube.surface;
      cube.uv = {};

      for (const faceName of FACE_NAMES) {
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

function albedoPixel(region, x, y) {
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
    const base = wrapBand === 0 ? [61, 43, 32, 255] : [43, 31, 25, 255];
    return shadeColor(base, Math.round(noise * 0.4) + Math.round(bevel * 0.25) + (seam ? -12 : 0));
  }
  if (region.surface === "gold") {
    const bandHighlight = y === Math.floor(region.height / 2) ? 9 : 0;
    return shadeColor([180, 127, 36, 255], noise + bevel + faceTone + bandHighlight);
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
  return shadeColor([158, 162, 159, 255], noise + bevel + faceTone + equatorBand);
}

function normalPixel(region, x, y) {
  if (isPerforation(region, x, y)) return [128, 128, 205, 255];
  if (region.surface === "leather" && (y + Math.floor(x / 2)) % 4 === 0) return [128, 121, 244, 255];
  const variation = Math.round((hash(x, y, region.seed + 100) - 0.5) * 4);
  return [128 + variation, 128 - variation, 250, 255];
}

function mersPixel(region, x, y) {
  if (region.surface === "leather") return [12, 0, 226, 255];
  if (region.surface === "gold") return [236, 0, 88, 255];
  if (isPerforation(region, x, y)) return [38, 0, 205, 255];
  const roughness = 102 + Math.round(hash(x, y, region.seed + 200) * 18);
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

const entity = png(entityModel.textureWidth, entityModel.textureHeight, () => [135, 137, 132, 255]);
const entityNormal = png(entityModel.textureWidth, entityModel.textureHeight, () => [128, 128, 255, 255]);
const entityMer = png(entityModel.textureWidth, entityModel.textureHeight, () => [0, 0, 255, 255]);
for (const region of entityModel.regions) {
  paintAtlasRegion(entity, region, albedoPixel);
  paintAtlasRegion(entityNormal, region, normalPixel);
  paintAtlasRegion(entityMer, region, mersPixel);
}
write("packs/resource/textures/entity/aspergillum.png", entity);
write("packs/resource/textures/entity/aspergillum_normal.png", entityNormal);
write("packs/resource/textures/entity/aspergillum_mer.png", entityMer);

const block = png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => {
  const hammered = Math.round((hash(Math.floor(x / 3), Math.floor(y / 3), 11) - 0.5) * 18);
  const grain = Math.round((hash(x, y, 37) - 0.5) * 6);
  const patina = hash(Math.floor(x / 8), Math.floor(y / 8), 71) > 0.87 ? -8 : 0;
  return [143 + hammered + grain + patina, 147 + hammered + grain + Math.round(patina * 0.55), 145 + hammered + grain, 255];
});
pasteImage(block, entity, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
write("packs/resource/textures/blocks/aspersorium.png", block);

const blockNormal = png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => {
  const broad = Math.round((hash(Math.floor(x / 3), Math.floor(y / 3), 19) - 0.5) * 8);
  const grain = Math.round((hash(x, y, 23) - 0.5) * 3);
  return [128 + broad + grain, 128 - broad + grain, 247, 255];
});
pasteImage(blockNormal, entityNormal, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
write("packs/resource/textures/blocks/aspersorium_normal.png", blockNormal);

const blockMer = png(ASPERSORIUM_ATLAS_SIZE, ASPERSORIUM_ATLAS_SIZE, (x, y) => [
  218,
  0,
  132 + Math.round(hash(Math.floor(x / 2), Math.floor(y / 2), 4) * 26),
  255,
]);
pasteImage(blockMer, entityMer, DOCKED_ATLAS_OFFSET[0], DOCKED_ATLAS_OFFSET[1]);
write("packs/resource/textures/blocks/aspersorium_mer.png", blockMer);

const water = png(32, 32, (x, y) => {
  const wave = Math.sin((x + y) * 0.7) * 9 + (hash(x, y, 31) - 0.5) * 10;
  return [56 + wave, 151 + wave, 190 + wave, 178];
});
for (let i = 0; i < 32; i += 1) setPixel(water, i, (i * 3 + 5) % 32, [164, 229, 242, 210]);
write("packs/resource/textures/blocks/holy_water.png", water);

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

const item = png(32, 32, () => [0, 0, 0, 0]);
const outline = [34, 39, 39, 255];
const metalDark = [104, 109, 106, 255];
const metal = [178, 180, 172, 255];
const shine = [229, 228, 211, 255];
const leather = [54, 40, 32, 255];
for (let y = 13; y <= 28; y += 1) {
  const x = 9 + Math.floor((28 - y) * 0.32);
  setPixel(item, x - 1, y, outline);
  setPixel(item, x, y, y > 22 ? leather : metal);
  setPixel(item, x + 1, y, y > 22 ? [77, 55, 40, 255] : shine);
  setPixel(item, x + 2, y, outline);
}
for (let y = 3; y <= 15; y += 1) {
  for (let x = 10; x <= 23; x += 1) {
    const dx = (x - 16.5) / 7;
    const dy = (y - 9) / 6.5;
    if (dx * dx + dy * dy <= 1) {
      const edge = dx * dx + dy * dy > 0.72;
      const hole = ((x * 2 + y * 3) % 7) === 0;
      setPixel(item, x, y, edge ? outline : hole ? metalDark : (x + y) % 5 === 0 ? shine : metal);
    }
  }
}
fillRect(item, 10, 14, 5, 2, [170, 123, 41, 255]);
write("packs/resource/textures/items/aspergillum.png", item);

function makePackIcon() {
  const icon = png(256, 256, (x, y) => {
    const vignette = Math.hypot(x - 128, y - 128) / 181;
    return [Math.round(31 - vignette * 11), Math.round(48 - vignette * 15), Math.round(54 - vignette * 13), 255];
  });
  fillRect(icon, 46, 139, 164, 13, [65, 70, 68, 255]);
  fillRect(icon, 58, 150, 140, 56, [142, 145, 139, 255]);
  fillRect(icon, 70, 206, 116, 13, [83, 89, 87, 255]);
  fillRect(icon, 72, 153, 112, 10, [66, 143, 169, 220]);
  for (let y = 46; y < 187; y += 1) {
    const x = 170 - Math.floor((y - 46) * 0.47);
    fillRect(icon, x - 5, y, 11, 2, y > 118 ? [58, 43, 35, 255] : [185, 184, 171, 255]);
  }
  for (let y = 30; y < 92; y += 1) {
    for (let x = 145; x < 211; x += 1) {
      const dx = (x - 178) / 34;
      const dy = (y - 61) / 32;
      if (dx * dx + dy * dy <= 1) setPixel(icon, x, y, ((x + y * 2) % 17 < 3) ? [36, 43, 43, 255] : silver(x, y, 41));
    }
  }
  return icon;
}

const packIcon = makePackIcon();
write("packs/resource/pack_icon.png", packIcon);
write("packs/behavior/pack_icon.png", packIcon);

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

const geometrySource = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/models/aspersorium.model.json"), "utf8"),
);
const baseGeometry = geometrySource["minecraft:geometry"][0];
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

const blockPath = path.join(root, "packs/behavior/blocks/aspersorium.block.json");
const blockDefinition = JSON.parse(fs.readFileSync(blockPath, "utf8"));
const blockContent = blockDefinition["minecraft:block"];
delete blockContent.description.states["aspergillum:water_level"];
blockContent.description.states["aspergillum:water_base"] = [0, 9];
blockContent.description.states["aspergillum:water_offset"] = Array.from({ length: 9 }, (_, index) => index);
blockContent.description.states["aspergillum:rotation"] = Array.from({ length: 16 }, (_, index) => index);
if (blockContent.description.traits) {
  delete blockContent.description.traits["minecraft:placement_direction"];
  if (Object.keys(blockContent.description.traits).length === 0) delete blockContent.description.traits;
}
const boneVisibility = blockContent.components["minecraft:geometry"].bone_visibility;
blockContent.components["minecraft:geometry"].identifier = "geometry.aspergillum.aspersorium.rotation_0";
delete blockContent.components["minecraft:geometry"].n_way_visual_rotation;
blockContent.permutations = blockContent.permutations.filter(
  (permutation) =>
    !permutation.condition.includes("minecraft:sixteen_way_rotation") &&
    !permutation.condition.includes("aspergillum:rotation"),
);
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
