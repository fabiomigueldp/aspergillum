import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const targets = [
  "dist",
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
  "packs/resource/models/blocks/aspersorium.rotations.geo.json"
];

for (const relative of targets) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Refusing to clean outside the workspace: ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
}
