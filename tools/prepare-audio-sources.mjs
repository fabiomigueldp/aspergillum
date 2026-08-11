import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const workspace = path.join(root, "tools/audio-source-workspace/outputs");
const manifestPath = path.join(root, "assets-src/audio/generation-manifest.json");
const catalogPath = path.join(root, "assets-src/audio/audio-catalog.json");
const rawRoot = path.join(root, "assets-src/audio/raw/selected/2026-08-05");
const recipePath = path.join(root, "assets-src/audio/audio-recipes.json");

const targetDurationByBatch = {
  SPR_PREP_A: 0.24,
  SPR_RELEASE_A: 0.32,
  ASP_FILL_A: 0.8,
  LOAD_PREP_A: 0.24,
  LOAD_COMMIT_1: 0.25,
  LOAD_COMMIT_2: 0.3,
  LOAD_COMMIT_3: 0.36,
  LOAD_COMMIT_4: 0.42,
  DOCK_MECH_A: 0.3,
  DOCK_WATER_1: 0.22,
  DOCK_WATER_2: 0.28,
  DOCK_WATER_3: 0.36,
  DOCK_WATER_4: 0.42,
  UNDOCK_A: 0.34,
  DRY_A: 0.18,
};

function fail(message) {
  throw new Error(`[prepare-audio-sources] ${message}`);
}

function decodeMonoFloat(file) {
  const result = spawnSync("ffmpeg", [
    "-v", "error", "-i", file, "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1",
  ], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) fail(`ffmpeg could not decode ${file}: ${result.stderr?.toString()}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
}

function findOnset(samples) {
  const windowSize = 480;
  const windows = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let energy = 0;
    const end = Math.min(samples.length, offset + windowSize);
    for (let index = offset; index < end; index += 1) {
      const sample = samples[index];
      energy += sample * sample;
    }
    windows.push(energy);
  }
  const totalEnergy = windows.reduce((sum, value) => sum + value, 0);
  let accumulated = 0;
  let onsetWindow = 0;
  for (; onsetWindow < windows.length; onsetWindow += 1) {
    accumulated += windows[onsetWindow];
    if (accumulated >= totalEnergy * 0.05) break;
  }
  return Math.max(0, onsetWindow * 0.01 - 0.008);
}

function analyseSegment(samples, startSeconds, durationSeconds, fadeInSeconds, fadeOutSeconds) {
  const start = Math.floor(startSeconds * 48000);
  const end = Math.min(samples.length, start + Math.ceil(durationSeconds * 48000));
  const fadeInSamples = Math.max(1, Math.round(fadeInSeconds * 48000));
  const fadeOutSamples = Math.max(1, Math.round(fadeOutSeconds * 48000));
  let peak = 0;
  let sumSquares = 0;
  for (let index = start; index < end; index += 1) {
    const relative = index - start;
    const remaining = end - index - 1;
    const envelope = Math.min(1, relative / fadeInSamples, remaining / fadeOutSamples);
    const sample = samples[index] * Math.max(0, envelope);
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, end - start));
  const db = (value) => value > 0 ? 20 * Math.log10(value) : -120;
  const peakDb = db(peak);
  const rmsDb = db(rms);
  return {
    peakDb,
    rmsDb,
    gainDb: Math.min(-24 - rmsDb, -2.5 - peakDb),
  };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (manifest.batches.length !== catalog.families.length) fail("manifest and catalog family counts differ");

const recipes = [];
for (let familyIndex = 0; familyIndex < manifest.batches.length; familyIndex += 1) {
  const batch = manifest.batches[familyIndex];
  const family = catalog.families[familyIndex];
  if (batch.selected.length !== family.paths.length) {
    fail(`${batch.id} selected count does not match ${family.id}`);
  }
  const targetDuration = targetDurationByBatch[batch.id];
  if (!targetDuration) fail(`missing target duration for ${batch.id}`);

  batch.selected.forEach((candidate, variantIndex) => {
    const sourceName = `${batch.id}_${candidate}.mp3`;
    const source = path.join(workspace, sourceName);
    if (!fs.existsSync(source)) fail(`missing generated candidate ${source}`);
    const rawDirectory = path.join(rawRoot, batch.id);
    fs.mkdirSync(rawDirectory, { recursive: true });
    const raw = path.join(rawDirectory, sourceName);
    fs.copyFileSync(source, raw);

    const samples = decodeMonoFloat(raw);
    const trimStartSeconds = findOnset(samples);
    const fadeInSeconds = 0.003;
    const fadeOutSeconds = targetDuration <= 0.25 ? 0.025 : 0.035;
    const metrics = analyseSegment(
      samples,
      trimStartSeconds,
      targetDuration,
      fadeInSeconds,
      fadeOutSeconds,
    );
    const output = family.paths[variantIndex].replace(/^sounds\//, "");
    recipes.push({
      family: family.id,
      event: `${family.id}.v${String(variantIndex + 1).padStart(2, "0")}`,
      source: path.relative(root, raw).replaceAll("\\", "/"),
      master: `assets-src/audio/masters/${output}.wav`,
      output: `packs/resource/sounds/${output}.ogg`,
      trimStartSeconds: Number(trimStartSeconds.toFixed(4)),
      durationSeconds: targetDuration,
      gainDb: Number(metrics.gainDb.toFixed(2)),
      fadeInSeconds,
      fadeOutSeconds,
      sourceMetrics: {
        peakDb: Number(metrics.peakDb.toFixed(2)),
        rmsDb: Number(metrics.rmsDb.toFixed(2)),
      },
    });
  });
}

fs.writeFileSync(recipePath, `${JSON.stringify({ schemaVersion: 1, recipes }, null, 2)}\n`);
console.log(`Prepared ${recipes.length} selected sources and recipes.`);
