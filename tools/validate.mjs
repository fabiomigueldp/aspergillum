import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const packRoots = [path.join(root, "packs", "behavior"), path.join(root, "packs", "resource")];
const errors = [];
let jsonCount = 0;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

for (const packRoot of packRoots) {
  if (!fs.existsSync(packRoot)) errors.push(`Missing pack: ${packRoot}`);
  for (const file of walk(packRoot)) {
    if (!file.endsWith(".json")) continue;
    jsonCount += 1;
    try {
      const source = fs.readFileSync(file, "utf8");
      JSON.parse(source);
      if (/minecraft-bedrock-(?:beta|experimental)|@minecraft\/server-beta/.test(source)) {
        errors.push(`Preview dependency in ${path.relative(root, file)}`);
      }
    } catch (error) {
      errors.push(`Invalid JSON ${path.relative(root, file)}: ${error.message}`);
    }
  }
}

const behaviorManifest = JSON.parse(fs.readFileSync(path.join(packRoots[0], "manifest.json"), "utf8"));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(packRoots[1], "manifest.json"), "utf8"));
const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const uuids = [
  behaviorManifest.header.uuid,
  ...behaviorManifest.modules.map((module) => module.uuid),
  resourceManifest.header.uuid,
  ...resourceManifest.modules.map((module) => module.uuid),
];
if (new Set(uuids).size !== uuids.length) errors.push("Manifest UUIDs are not unique");
if (!behaviorManifest.dependencies.some((dependency) => dependency.uuid === resourceManifest.header.uuid)) {
  errors.push("Behavior Pack does not depend on the Resource Pack UUID");
}
if (!behaviorManifest.dependencies.some((dependency) => dependency.module_name === "@minecraft/server" && dependency.version === "2.8.0")) {
  errors.push("Behavior Pack must pin @minecraft/server 2.8.0");
}
if (behaviorManifest.header.name === resourceManifest.header.name) {
  errors.push("Behavior and Resource Packs require distinct localization keys");
}

const expectedPackVersion = packageMetadata.version.split(".").map(Number);
if (JSON.stringify(behaviorManifest.header.version) !== JSON.stringify(expectedPackVersion)) {
  errors.push("Behavior Pack version does not match package.json");
}
if (JSON.stringify(resourceManifest.header.version) !== JSON.stringify(expectedPackVersion)) {
  errors.push("Resource Pack version does not match package.json");
}

const blockDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "blocks", "aspersorium.block.json"), "utf8"),
);
const block = blockDefinition["minecraft:block"];
const baseGeometry = block?.components?.["minecraft:geometry"];
if ("n_way_visual_rotation" in (baseGeometry ?? {})) {
  errors.push("Aspersorium must not use experimental n_way_visual_rotation");
}
if (baseGeometry?.identifier !== "geometry.aspergillum.aspersorium.rotation_0") {
  errors.push("Aspersorium must use the generated zero-degree geometry by default");
}
const rotations = new Set(
  block?.permutations
    ?.filter((permutation) => permutation.condition.includes("aspergillum:rotation"))
    .map((permutation) => permutation.components?.["minecraft:geometry"]?.identifier),
);
for (let rotationIndex = 1; rotationIndex < 16; rotationIndex += 1) {
  if (!rotations.has(`geometry.aspergillum.aspersorium.rotation_${rotationIndex}`)) {
    errors.push(`Missing stable aspersorium rotation ${rotationIndex}`);
  }
}
if (JSON.stringify(blockDefinition).includes("minecraft:sixteen_way_rotation")) {
  errors.push("Aspersorium must not use experimental minecraft:sixteen_way_rotation");
}
const rotationState = block?.description?.states?.["aspergillum:rotation"];
if (!Array.isArray(rotationState) || rotationState.length !== 16) {
  errors.push("Aspersorium requires sixteen values in its stable custom rotation state");
}

for (const recipeName of ["aspergillum.recipe.json", "aspersorium.recipe.json"]) {
  const recipe = JSON.parse(fs.readFileSync(path.join(packRoots[0], "recipes", recipeName), "utf8"));
  const unlock = recipe["minecraft:recipe_shaped"]?.unlock;
  if (!Array.isArray(unlock) || unlock.length === 0) errors.push(`${recipeName} requires unlock data`);
}

for (const particleName of ["holy_water_droplet.particle.json"]) {
  const source = fs.readFileSync(path.join(packRoots[1], "particles", particleName), "utf8");
  if (/q\.(?:particle_age|particle_lifetime)/.test(source)) {
    errors.push(`${particleName} uses entity queries instead of particle variables`);
  }
}
const attachableSource = fs.readFileSync(
  path.join(packRoots[1], "attachables", "aspergillum.attachable.json"),
  "utf8",
);
if (/q\.is_swinging/.test(attachableSource)) errors.push("Attachable uses unsupported q.is_swinging");
if (!attachableSource.includes("controller.render.aspergillum.held")) {
  errors.push("Attachable must use its dedicated render controller");
}

const heldGeometry = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "models", "entity", "aspergillum.geo.json"), "utf8"),
);
const heldBone = heldGeometry?.["minecraft:geometry"]?.[0]?.bones?.[0];
if (heldBone?.name !== "aspergillum") {
  errors.push("Held geometry must use a unique non-player bone name");
}
if (heldBone?.binding !== "q.item_slot_to_bone_name(c.item_slot)") {
  errors.push("Held geometry must bind to the canonical item-slot bone");
}
if (JSON.stringify(heldBone?.pivot) !== JSON.stringify([0, 24, 0])) {
  errors.push("Held geometry must share the vanilla long-item coordinate frame");
}

const displayAnimations = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "animations", "aspergillum.animation.json"), "utf8"),
).animations;
const firstPersonBone = displayAnimations?.["animation.aspergillum.held.hold_first_person"]?.bones?.aspergillum;
const thirdPersonBone = displayAnimations?.["animation.aspergillum.held.hold_third_person"]?.bones?.aspergillum;
if (
  JSON.stringify(firstPersonBone?.position) !== JSON.stringify([-7, -3, -2]) ||
  JSON.stringify(firstPersonBone?.rotation) !== JSON.stringify([152, -9, 25])
) {
  errors.push("First-person attachable must use the proven vanilla trident pose");
}
if (
  JSON.stringify(thirdPersonBone?.position) !== JSON.stringify([1.5, -2.5, -10.5]) ||
  JSON.stringify(thirdPersonBone?.rotation) !== JSON.stringify([97, -1.5, -49])
) {
  errors.push("Third-person attachable must use the proven vanilla trident pose");
}

const wieldController = JSON.parse(
  fs.readFileSync(
    path.join(packRoots[1], "animation_controllers", "aspergillum.animation_controllers.json"),
    "utf8",
  ),
)?.animation_controllers?.["controller.animation.aspergillum.wield"];
if (!wieldController?.states?.first_person || !wieldController?.states?.third_person) {
  errors.push("Attachable requires a first/third-person wield controller");
}
if (!attachableSource.includes('"animate": ["wield"]')) {
  errors.push("Attachable must run its perspective controller continuously");
}

const itemDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "items", "aspergillum.item.json"), "utf8"),
);
const itemComponents = itemDefinition?.["minecraft:item"]?.components;
if (itemComponents?.["minecraft:swing_duration"]?.value !== itemComponents?.["minecraft:cooldown"]?.duration) {
  errors.push("Aspergillum swing duration and attack cooldown must remain synchronized");
}

const playerAnimations = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "animations", "player.animation.json"), "utf8"),
).animations;
for (const animationName of ["animation.aspergillum.player.sprinkle", "animation.aspergillum.player.load"]) {
  const bones = playerAnimations?.[animationName]?.bones;
  if (!bones?.rightarm || !bones?.rightitem) {
    errors.push(`${animationName} must animate canonical rightarm and rightitem bones together`);
  }
}

const compiledScript = fs.readFileSync(path.join(packRoots[0], "scripts", "main.js"), "utf8");
if (compiledScript.includes("minecraft:water_splash_particle")) {
  errors.push("Compiled script must not spawn the variable-dependent vanilla water splash particle");
}
if (compiledScript.includes("holy_water_mist")) {
  errors.push("Compiled script must not spawn the removed mist effect");
}
if (fs.existsSync(path.join(packRoots[1], "particles", "holy_water_mist.particle.json"))) {
  errors.push("Removed mist particle definition is still present");
}

const required = [
  "packs/behavior/scripts/main.js",
  "packs/resource/pack_icon.png",
  "packs/behavior/pack_icon.png",
  "packs/resource/textures/items/aspergillum.png",
  "packs/resource/textures/entity/aspergillum.png",
  "packs/resource/textures/blocks/aspersorium.png",
  "packs/resource/textures/particle/holy_water.png",
  "packs/resource/models/blocks/aspersorium.rotations.geo.json",
  "packs/resource/animation_controllers/aspergillum.animation_controllers.json",
  "packs/resource/render_controllers/aspergillum.render_controllers.json",
];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing generated asset: ${relative}`);

for (const file of walk(path.join(root, "packs", "resource", "textures")).filter((entry) => entry.endsWith(".png"))) {
  try {
    const image = PNG.sync.read(fs.readFileSync(file));
    const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
    if (!powerOfTwo(image.width) || !powerOfTwo(image.height)) errors.push(`Non-power-of-two texture: ${path.relative(root, file)}`);
  } catch (error) {
    errors.push(`Unreadable PNG ${path.relative(root, file)}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${jsonCount} JSON files, ${uuids.length} UUIDs, and all generated textures.`);
