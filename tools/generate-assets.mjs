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

const FACE_NAMES = ["north", "east", "south", "west", "up", "down"];
const UV_PADDING = 2;

function faceTexelSize(size, faceName) {
  const [sizeX, sizeY, sizeZ] = size;
  const dimensions = faceName === "east" || faceName === "west"
    ? [sizeZ, sizeY]
    : faceName === "north" || faceName === "south"
      ? [sizeX, sizeY]
      : [sizeX, sizeZ];
  return dimensions.map((dimension) => Math.max(1, Math.ceil(dimension)));
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
        const [width, height] = faceTexelSize(cube.size, faceName);
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
  const border = x === 0 || y === 0 || x === region.width - 1 || y === region.height - 1;
  return !border && ((x * 3 + y * 5 + region.seed) % 7 <= 1);
}

function albedoPixel(region, x, y) {
  const noise = Math.round((hash(x, y, region.seed) - 0.5) * 10);
  const topOrLeft = x === 0 || y === 0;
  const bottomOrRight = x === region.width - 1 || y === region.height - 1;
  const bevel = topOrLeft ? 13 : bottomOrRight ? -12 : 0;

  if (region.surface === "leather") {
    const band = Math.floor(y / 2) % 2 === 0 ? [58, 45, 36, 255] : [43, 34, 29, 255];
    return shadeColor(band, Math.round(noise * 0.45) + Math.round(bevel * 0.35));
  }
  if (region.surface === "gold") {
    return shadeColor([177, 128, 42, 255], noise + bevel);
  }
  if (isPerforation(region, x, y)) {
    return [30, 35, 35, 255];
  }
  return shadeColor([162, 164, 158, 255], noise + bevel);
}

function normalPixel(region, x, y) {
  if (isPerforation(region, x, y)) return [128, 128, 236, 255];
  const variation = Math.round((hash(x, y, region.seed + 100) - 0.5) * 4);
  return [128 + variation, 128 - variation, 252, 255];
}

function mersPixel(region, x, y) {
  if (region.surface === "leather") return [18, 0, 215, 255];
  if (region.surface === "gold") return [238, 0, 82, 255];
  if (isPerforation(region, x, y)) return [42, 0, 190, 255];
  return [224, 0, 118, 255];
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

const block = png(64, 64, (x, y) => silver(x, y, 11));
for (let y = 0; y < 64; y += 8) fillRect(block, 0, y, 64, 1, [112, 115, 112, 255]);
for (let x = 4; x < 64; x += 11) fillRect(block, x, 0, 1, 64, [187, 188, 180, 255]);
write("packs/resource/textures/blocks/aspersorium.png", block);

const blockNormal = png(64, 64, (x, y) => {
  const d = Math.round((hash(x, y, 19) - 0.5) * 8);
  return [128 + d, 128 - d, 250, 255];
});
write("packs/resource/textures/blocks/aspersorium_normal.png", blockNormal);

const blockMer = png(64, 64, (x, y) => [220, 0, 118 + Math.round(hash(x, y, 4) * 20), 255]);
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

const geometrySource = JSON.parse(
  fs.readFileSync(path.join(root, "packs/resource/models/blocks/aspersorium.geo.json"), "utf8"),
);
const baseGeometry = geometrySource["minecraft:geometry"][0];
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
