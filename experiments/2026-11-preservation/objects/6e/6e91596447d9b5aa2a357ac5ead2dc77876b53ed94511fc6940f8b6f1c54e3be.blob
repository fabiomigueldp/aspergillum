import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const recipeDocument = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/audio/audio-recipes.json"), "utf8"),
);
const generationManifest = JSON.parse(
  fs.readFileSync(path.join(root, "assets-src/audio/generation-manifest.json"), "utf8"),
);
const reportDirectory = path.join(root, "reports/audio");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function ensureParent(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function replaceFile(source, destination) {
  fs.rmSync(destination, { force: true });
  fs.renameSync(source, destination);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function probe(file) {
  return JSON.parse(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels",
    "-of", "json", file,
  ]));
}

const inventory = [];
for (const recipe of recipeDocument.recipes) {
  const source = path.join(root, recipe.source);
  const master = path.join(root, recipe.master);
  const output = path.join(root, recipe.output);
  if (!fs.existsSync(source)) throw new Error(`Missing audio source: ${recipe.source}`);
  ensureParent(master);
  ensureParent(output);

  const fadeOutStart = Math.max(0, recipe.durationSeconds - recipe.fadeOutSeconds);
  const filter = [
    `atrim=start=${recipe.trimStartSeconds}:duration=${recipe.durationSeconds}`,
    "asetpts=PTS-STARTPTS",
    `volume=${recipe.gainDb}dB`,
    `afade=t=in:st=0:d=${recipe.fadeInSeconds}`,
    `afade=t=out:st=${fadeOutStart}:d=${recipe.fadeOutSeconds}`,
    "alimiter=limit=0.891251:attack=1:release=20",
  ].join(",");

  const masterTemp = `${master}.tmp.wav`;
  const outputTemp = `${output}.tmp.ogg`;
  run("ffmpeg", [
    "-y", "-v", "error", "-i", source, "-af", filter,
    "-ac", "1", "-ar", "48000", "-c:a", "pcm_s24le", masterTemp,
  ]);
  run("ffmpeg", [
    "-y", "-v", "error", "-i", masterTemp, "-map_metadata", "-1",
    "-ac", "1", "-ar", "48000", "-c:a", "libvorbis", "-q:a", "5",
    "-fflags", "+bitexact", "-flags:a", "+bitexact", "-serial_offset", "0", outputTemp,
  ]);
  replaceFile(masterTemp, master);
  replaceFile(outputTemp, output);

  const metadata = probe(output);
  const stream = metadata.streams[0];
  inventory.push({
    event: recipe.event,
    family: recipe.family,
    file: recipe.output,
    sha256: sha256(output),
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    durationSeconds: Number(Number(metadata.format.duration).toFixed(4)),
    source: recipe.source,
    sourceSha256: sha256(source),
  });
}

fs.mkdirSync(reportDirectory, { recursive: true });
fs.writeFileSync(
  path.join(reportDirectory, "audio-inventory.json"),
  `${JSON.stringify({ schemaVersion: 1, sourceGenerationDate: generationManifest.generatedAt, files: inventory }, null, 2)}\n`,
);
const markdown = [
  "# Audio inventory",
  "",
  `Generated variants: **${inventory.length}**`,
  "",
  "| Event | Duration | SHA-256 |",
  "| --- | ---: | --- |",
  ...inventory.map((entry) => `| \`${entry.event}\` | ${entry.durationSeconds.toFixed(3)} s | \`${entry.sha256}\` |`),
  "",
].join("\n");
fs.writeFileSync(path.join(reportDirectory, "audio-inventory.md"), markdown);
console.log(`Built ${inventory.length} deterministic mono 48 kHz OGG variants.`);
