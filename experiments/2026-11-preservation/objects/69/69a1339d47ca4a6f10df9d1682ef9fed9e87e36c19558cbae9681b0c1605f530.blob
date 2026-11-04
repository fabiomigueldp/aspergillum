import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");

/** Verify approved bytes; never regenerate, copy or rewrite audio implicitly. */
export function verifyPreservedAudio(root = projectRoot) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "tools/audio-baseline.json"), "utf8"));
  const recipes = JSON.parse(fs.readFileSync(path.join(root, "assets-src/audio/audio-recipes.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || recipes.recipes?.length !== 48) throw new Error("Unexpected preserved-audio contract");
  const expected = new Set([
    "assets-src/audio/audio-recipes.json", "assets-src/audio/audio-catalog.json", "tools/build-audio.mjs",
    ...recipes.recipes.flatMap((recipe) => [recipe.source, recipe.master, recipe.output]),
  ]);
  const files = manifest.files;
  if (!files || Object.keys(files).length !== expected.size) throw new Error("Incomplete preserved-audio hash inventory");
  for (const relative of expected) {
    if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
      throw new Error("Unsafe preserved-audio path");
    }
    if (!/^[a-f0-9]{64}$/.test(files[relative] ?? "")) throw new Error(`Missing preserved-audio hash: ${relative}`);
    const bytes = fs.readFileSync(path.join(root, relative));
    const actual = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actual !== files[relative]) {
      throw new Error(`Approved audio bytes changed: ${relative}. Do not re-encode during compact-state work; review audio changes separately.`);
    }
  }
  return { files: expected.size, outputs: recipes.recipes.length, baseline: manifest.baseline };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyPreservedAudio();
  console.log(`Preserved baseline audio verified: ${result.outputs} OGGs plus source/master/tool hashes (${result.files} files); no encoding or writes.`);
}
