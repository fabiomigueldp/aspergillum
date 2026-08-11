import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const workTargets = [
  "packs/behavior/scripts/main.js",
  "packs/behavior/pack_icon.png",
  "packs/resource/pack_icon.png",
  "packs/resource/textures/items/aspergillum.png",
  "packs/resource/textures/entity/aspergillum.png",
  "packs/resource/textures/entity/aspergillum_mer.png",
  "packs/resource/textures/entity/aspergillum_normal.png",
  "packs/resource/textures/blocks/aspersorium.png",
  "packs/resource/textures/blocks/aspersorium_mer.png",
  "packs/resource/textures/blocks/aspersorium_normal.png",
  "packs/resource/textures/blocks/holy_water.png",
  "packs/resource/textures/particle/holy_water.png",
  "packs/resource/textures/entity/thurible.png",
  "packs/resource/textures/entity/thurible_normal.png",
  "packs/resource/textures/entity/thurible_mer.png",
  "packs/resource/textures/items/thurible.png",
  "packs/resource/textures/particle/incense_smoke.png",
  "packs/resource/textures/particle/incense_veil.png",
  "packs/resource/models/blocks/aspersorium.geo.json",
  "packs/resource/models/blocks/aspersorium.rotations.geo.json"
];
const artifactTargets = ["dist/releases", "dist/validation", "dist/diagnostics", "out/addon-manager"];

const argument = process.argv[2] ?? "--work";
if (!["--work", "--artifacts", "--all"].includes(argument) || process.argv.length > 3) {
  throw new Error("Uso: node tools/clean.mjs --work|--artifacts|--all");
}
const targets = argument === "--work" ? workTargets : argument === "--artifacts" ? artifactTargets : [...workTargets, ...artifactTargets];

for (const relative of targets) {
  const target = path.resolve(root, relative);
  if (target === root || !target.startsWith(`${root}${path.sep}`)) throw new Error(`Recusa de limpeza fora do workspace: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
}
console.log(`Limpeza ${argument.slice(2)} concluída (${targets.length} alvos explícitos).`);
