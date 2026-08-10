import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(
  path.join(root, "assets-src", "customization", "catalog.json"),
  "utf8",
));
const errors = [];

function suffix(cosmetic) {
  return cosmetic.id === "classic" ? "" : `_${cosmetic.id}`;
}

function pixel(image, x, y) {
  const offset = (image.width * y + x) << 2;
  return [...image.data.subarray(offset, offset + 4)];
}

function distance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function luminance([red, green, blue]) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function mean(pixels) {
  return [0, 1, 2].map((channel) => (
    pixels.reduce((total, value) => total + value[channel], 0) / pixels.length
  ));
}

function gripPixels(image) {
  const pixels = [];
  for (let y = 20; y <= 28; y += 1) {
    const centerX = 9 + Math.floor((28 - y) * 0.32);
    for (let x = centerX - 1; x <= centerX + 1; x += 1) pixels.push(pixel(image, x, y));
  }
  return pixels;
}

function headPixels(image) {
  const pixels = [];
  for (let y = 2; y <= 15; y += 1) {
    for (let x = 9; x <= 24; x += 1) {
      const value = pixel(image, x, y);
      if (value[3] === 0) continue;
      if (value[0] === 34 && value[1] === 39 && value[2] === 39) continue;
      if (value[0] === 25 && value[1] === 30 && value[2] === 30) continue;
      pixels.push(value);
    }
  }
  return pixels;
}

const summaries = catalog.cosmetics.map((cosmetic) => {
  const file = path.join(
    root,
    "packs",
    "resource",
    "textures",
    "items",
    `aspergillum${suffix(cosmetic)}.png`,
  );
  if (!fs.existsSync(file)) {
    errors.push(`Missing cosmetic icon: ${path.relative(root, file)}`);
    return null;
  }
  const image = PNG.sync.read(fs.readFileSync(file));
  if (image.width !== 32 || image.height !== 32) {
    errors.push(`${cosmetic.id} icon must remain 32x32`);
  }
  const grip = gripPixels(image);
  const head = headPixels(image);
  if (grip.length !== 27 || grip.some((value) => value[3] !== 255)) {
    errors.push(`${cosmetic.id} must expose a continuous 9x3 opaque grip signature`);
  }
  if (head.length < 80) errors.push(`${cosmetic.id} metal head signature is too small`);
  const gripLuminances = grip.map(luminance);
  if (Math.max(...gripLuminances) - Math.min(...gripLuminances) < 28) {
    errors.push(`${cosmetic.id} grip lacks internal light/dark contrast`);
  }
  return {
    cosmetic,
    image,
    gripMean: mean(grip),
    headMean: mean(head),
  };
}).filter(Boolean);

let minimumGripDistance = Number.POSITIVE_INFINITY;
let minimumMetalDistance = Number.POSITIVE_INFINITY;
for (let leftIndex = 0; leftIndex < summaries.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < summaries.length; rightIndex += 1) {
    const left = summaries[leftIndex];
    const right = summaries[rightIndex];
    if (left.cosmetic.metal === right.cosmetic.metal) {
      const currentDistance = distance(left.gripMean, right.gripMean);
      minimumGripDistance = Math.min(minimumGripDistance, currentDistance);
      if (currentDistance < 30) {
        errors.push(`${left.cosmetic.id}/${right.cosmetic.id} grip signatures are too similar (${currentDistance.toFixed(1)})`);
      }
    }
    if (left.cosmetic.grip === right.cosmetic.grip) {
      const currentDistance = distance(left.headMean, right.headMean);
      minimumMetalDistance = Math.min(minimumMetalDistance, currentDistance);
      if (currentDistance < 38) {
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
    `Cosmetic icons valid: ${summaries.length} finishes, minimum grip distance ${minimumGripDistance.toFixed(1)}, minimum metal distance ${minimumMetalDistance.toFixed(1)}.`,
  );
}
