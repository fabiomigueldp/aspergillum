import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const catalog = readJson("assets-src/audio/audio-catalog.json");
const recipes = readJson("assets-src/audio/audio-recipes.json");
const definitions = readJson("packs/resource/sounds/sound_definitions.json");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function error(message) {
  errors.push(message);
}

function probe(file) {
  const result = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels",
    "-of", "json", file,
  ], { encoding: "utf8" });
  if (result.status !== 0) return undefined;
  return JSON.parse(result.stdout);
}

if (definitions.format_version !== "1.20.20") error("sound_definitions format_version must be 1.20.20");
if (recipes.recipes.length !== 48) error(`expected 48 recipes, got ${recipes.recipes.length}`);

const expectedFiles = new Set();
const expectedEvents = new Set();
for (const family of catalog.families) {
  expectedEvents.add(family.id);
  family.paths.forEach((soundPath, index) => {
    const event = `${family.id}.v${String(index + 1).padStart(2, "0")}`;
    expectedEvents.add(event);
    const file = path.join(root, "packs/resource", `${soundPath}.ogg`);
    expectedFiles.add(path.resolve(file));
    if (!fs.existsSync(file)) {
      error(`missing OGG for ${event}: ${path.relative(root, file)}`);
      return;
    }
    const metadata = probe(file);
    const stream = metadata?.streams?.[0];
    const duration = Number(metadata?.format?.duration);
    if (stream?.codec_name !== "vorbis") error(`${event} must use Vorbis`);
    if (Number(stream?.sample_rate) !== 48000) error(`${event} must be 48 kHz`);
    if (stream?.channels !== 1) error(`${event} must be mono`);
    if (!Number.isFinite(duration) || duration < 0.15 || duration > 0.85) {
      error(`${event} has invalid duration ${duration}`);
    }
  });
}

const actualDefinitions = definitions.sound_definitions ?? {};
for (const event of expectedEvents) {
  if (!actualDefinitions[event]) error(`missing sound definition ${event}`);
}
for (const event of Object.keys(actualDefinitions)) {
  if (!expectedEvents.has(event)) error(`orphan sound definition ${event}`);
  const serialised = JSON.stringify(actualDefinitions[event]);
  if (/sounds\/(random|bucket|armor|item|block)\//i.test(serialised)) {
    error(`${event} refers to a vanilla raw sound path`);
  }
}

const soundsRoot = path.join(root, "packs/resource/sounds/aspergillum");
const actualFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.name.endsWith(".ogg")) actualFiles.push(path.resolve(file));
  }
}
collect(soundsRoot);
for (const file of actualFiles) {
  if (!expectedFiles.has(file)) error(`orphan OGG ${path.relative(root, file)}`);
}
if (actualFiles.length !== 48) error(`expected exactly 48 OGG files, got ${actualFiles.length}`);

for (const recipe of recipes.recipes) {
  for (const key of ["source", "master", "output"]) {
    if (!fs.existsSync(path.join(root, recipe[key]))) error(`recipe ${recipe.event} missing ${key}: ${recipe[key]}`);
  }
}

if (errors.length) {
  console.error(`Audio validation failed (${errors.length}):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Audio validation passed: ${catalog.families.length} families, 48 mono 48 kHz OGG variants.`);
