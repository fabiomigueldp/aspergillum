import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(
  path.join(root, "assets-src", "customization", "catalog.json"),
  "utf8",
));
const sourceDirectory = path.join(root, "assets-src", "inventory-icons");
const manifestPath = path.join(sourceDirectory, "inventory-icon-manifest.json");
const errors = [];

function fileName(cosmetic) {
  return cosmetic.id === "classic"
    ? "aspergillum.png"
    : `aspergillum_${cosmetic.id}.png`;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pixel(image, x, y) {
  const offset = (image.width * y + x) << 2;
  return [...image.data.subarray(offset, offset + 4)];
}

function luminance([red, green, blue]) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function alphaBounds(image, threshold = 8) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  let opaquePixels = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = pixel(image, x, y)[3];
      if (alpha < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      visiblePixels += 1;
      if (alpha >= 192) opaquePixels += 1;
    }
  }
  if (maxX < minX) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    visiblePixels,
    opaquePixels,
  };
}

function projectionContext(image, rotationDegrees) {
  const radians = rotationDegrees * Math.PI / 180;
  const axis = [Math.sin(radians), -Math.cos(radians)];
  const projections = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (pixel(image, x, y)[3] < 32) continue;
      projections.push((x + 0.5) * axis[0] + (y + 0.5) * axis[1]);
    }
  }
  return {
    axis,
    minimum: Math.min(...projections),
    maximum: Math.max(...projections),
  };
}

function normalizedProjection(context, x, y) {
  const projection = (x + 0.5) * context.axis[0] + (y + 0.5) * context.axis[1];
  return (projection - context.minimum) / (context.maximum - context.minimum);
}

function regionPixels(image, context, minimum, maximum) {
  const values = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const value = pixel(image, x, y);
      if (value[3] < 64) continue;
      const position = normalizedProjection(context, x, y);
      if (position >= minimum && position <= maximum) values.push(value);
    }
  }
  return values;
}

function regionRmsDistance(left, right, rotationDegrees, minimum, maximum) {
  const context = projectionContext(left, rotationDegrees);
  let squaredDistance = 0;
  let weight = 0;
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const position = normalizedProjection(context, x, y);
      if (position < minimum || position > maximum) continue;
      const leftPixel = pixel(left, x, y);
      const rightPixel = pixel(right, x, y);
      const alphaWeight = Math.min(leftPixel[3], rightPixel[3]) / 255;
      if (alphaWeight < 0.2) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        squaredDistance += (leftPixel[channel] - rightPixel[channel]) ** 2 * alphaWeight;
      }
      weight += alphaWeight * 3;
    }
  }
  return weight ? Math.sqrt(squaredDistance / weight) : 0;
}

let manifest = null;
if (!fs.existsSync(manifestPath)) {
  errors.push("Missing authoritative inventory icon manifest");
} else {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`Invalid inventory icon manifest: ${error.message}`);
  }
}

if (manifest) {
  if (manifest.schemaVersion !== 1) errors.push("Inventory icon manifest schema must remain 1");
  if (manifest.renderer?.name !== "Aspergillum Inventory Icon Renderer") {
    errors.push("Inventory icon manifest must identify the model-derived renderer");
  }
  if (manifest.renderer?.version !== 1) errors.push("Inventory icon renderer version must remain 1");
  if (manifest.config?.subject !== "aspergillum" || manifest.config?.material !== "pbr") {
    errors.push("Inventory icons must remain derived from the real aspergillum with PBR materials");
  }
  if (manifest.config?.lighting !== "inventory") {
    errors.push("Inventory icons must retain the dedicated high-legibility lighting preset");
  }
  if (manifest.config?.transparent !== true || manifest.config?.outputSize !== 32) {
    errors.push("Inventory icons must retain transparent native 32 px output");
  }
  if (manifest.config?.rotationDegrees !== 35) {
    errors.push("Inventory icon semantic axis changed without a validator update");
  }
}

const rotationDegrees = manifest?.config?.rotationDegrees ?? 35;
const summaries = catalog.cosmetics.map((cosmetic) => {
  const name = fileName(cosmetic);
  const sourcePath = path.join(sourceDirectory, name);
  const packPath = path.join(root, "packs", "resource", "textures", "items", name);
  if (!fs.existsSync(sourcePath)) {
    errors.push(`Missing authoritative cosmetic icon: ${path.relative(root, sourcePath)}`);
    return null;
  }
  if (!fs.existsSync(packPath)) {
    errors.push(`Missing published cosmetic icon: ${path.relative(root, packPath)}`);
    return null;
  }
  const sourceBytes = fs.readFileSync(sourcePath);
  const packBytes = fs.readFileSync(packPath);
  if (!sourceBytes.equals(packBytes)) errors.push(`${cosmetic.id} pack icon differs from its authoritative source`);
  const image = PNG.sync.read(sourceBytes);
  if (image.width !== 32 || image.height !== 32) errors.push(`${cosmetic.id} icon must remain 32x32`);
  const bounds = alphaBounds(image);
  if (!bounds) {
    errors.push(`${cosmetic.id} icon is fully transparent`);
    return null;
  }
  if (bounds.width < 18 || bounds.height < 24) errors.push(`${cosmetic.id} model silhouette is too small`);
  if (bounds.minX < 1 || bounds.minY < 1 || bounds.maxX > 30 || bounds.maxY > 30) {
    errors.push(`${cosmetic.id} model silhouette violates the one-pixel safe margin`);
  }
  if (bounds.visiblePixels < 70 || bounds.opaquePixels < 40) {
    errors.push(`${cosmetic.id} model silhouette lacks native-scale coverage`);
  }
  const context = projectionContext(image, rotationDegrees);
  const grip = regionPixels(image, context, 0.1, 0.43);
  const head = regionPixels(image, context, 0.56, 1);
  if (grip.length < 8) errors.push(`${cosmetic.id} grip signature is too small`);
  if (head.length < 28) errors.push(`${cosmetic.id} metal head signature is too small`);
  const visible = regionPixels(image, context, 0, 1);
  const luminances = visible.map(luminance);
  if (Math.max(...luminances) - Math.min(...luminances) < 45) {
    errors.push(`${cosmetic.id} lacks internal light/dark contrast`);
  }
  const record = manifest?.icons?.find((candidate) => candidate.id === cosmetic.id);
  const digest = sha256(sourceBytes);
  if (!record || record.file !== name || record.bytes !== sourceBytes.byteLength || record.sha256 !== digest) {
    errors.push(`${cosmetic.id} manifest bytes/hash do not match the authoritative PNG`);
  }
  return { cosmetic, image, digest };
}).filter(Boolean);

if (manifest?.icons?.length !== catalog.cosmetics.length) {
  errors.push(`Inventory icon manifest must contain ${catalog.cosmetics.length} finishes`);
}
if (new Set(summaries.map(({ digest }) => digest)).size !== summaries.length) {
  errors.push("Every cosmetic combination must publish a distinct inventory icon");
}

let minimumGripDistance = Number.POSITIVE_INFINITY;
let minimumMetalDistance = Number.POSITIVE_INFINITY;
for (let leftIndex = 0; leftIndex < summaries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < summaries.length; rightIndex += 1) {
    const left = summaries[leftIndex];
    const right = summaries[rightIndex];
    if (left.cosmetic.metal === right.cosmetic.metal) {
      const currentDistance = regionRmsDistance(
        left.image,
        right.image,
        rotationDegrees,
        0.1,
        0.43,
      );
      minimumGripDistance = Math.min(minimumGripDistance, currentDistance);
      if (currentDistance < 6) {
        errors.push(`${left.cosmetic.id}/${right.cosmetic.id} grip signatures are too similar (${currentDistance.toFixed(1)})`);
      }
    }
    if (left.cosmetic.grip === right.cosmetic.grip) {
      const currentDistance = regionRmsDistance(
        left.image,
        right.image,
        rotationDegrees,
        0.56,
        1,
      );
      minimumMetalDistance = Math.min(minimumMetalDistance, currentDistance);
      if (currentDistance < 10.5) {
        errors.push(`${left.cosmetic.id}/${right.cosmetic.id} metal signatures are too similar (${currentDistance.toFixed(1)})`);
      }
    }
  }
}

if (errors.length) {
  console.error("Cosmetic icon validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Cosmetic icons valid: ${summaries.length} model-derived finishes, minimum grip RMS ${minimumGripDistance.toFixed(1)}, minimum metal RMS ${minimumMetalDistance.toFixed(1)}.`,
  );
}
