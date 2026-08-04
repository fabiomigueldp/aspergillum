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
const materialInstances = block?.components?.["minecraft:material_instances"] ?? {};
const renderMethods = new Set(
  Object.values(materialInstances)
    .map((instance) => instance?.render_method)
    .filter(Boolean),
);
if (renderMethods.size > 1) {
  errors.push("All Aspersorium material instances must use the same render method");
}

for (const recipeName of ["aspergillum.recipe.json", "aspersorium.recipe.json"]) {
  const recipe = JSON.parse(fs.readFileSync(path.join(packRoots[0], "recipes", recipeName), "utf8"));
  const unlock = recipe["minecraft:recipe_shaped"]?.unlock;
  if (!Array.isArray(unlock) || unlock.length === 0) errors.push(`${recipeName} requires unlock data`);
}
const aspersoriumRecipe = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "recipes", "aspersorium.recipe.json"), "utf8"),
)["minecraft:recipe_shaped"];
if (aspersoriumRecipe?.key?.C?.item !== "minecraft:chain") {
  errors.push("Aspersorium recipe must remain distinct from the vanilla cauldron recipe");
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
if (heldGeometry?.format_version !== "1.16.0") {
  errors.push("Attachable binding requires geometry format_version 1.16.0");
}
const heldBones = heldGeometry?.["minecraft:geometry"]?.[0]?.bones ?? [];
if (heldBones.length !== 5) {
  errors.push("Held geometry must contain bound, presentation, action, handle, and sprinkler-head bones");
}
const boundBone = heldBones.find((bone) => bone.name === "aspergillum_bound");
const presentationBone = heldBones.find((bone) => bone.name === "aspergillum_presentation");
const actionBone = heldBones.find((bone) => bone.name === "aspergillum_action");
const handleBone = heldBones.find((bone) => bone.name === "handle");
const sprinklerHeadBone = heldBones.find((bone) => bone.name === "sprinkler_head");
if (boundBone?.name !== "aspergillum_bound") {
  errors.push("Pose-calibration geometry requires the aspergillum_bound root");
}
if (boundBone?.binding !== "q.item_slot_to_bone_name(context.item_slot)") {
  errors.push("Bound bone must use the exact documented item-slot binding expression");
}
if (JSON.stringify(boundBone?.pivot) !== JSON.stringify([0, 0, 0])) {
  errors.push("Bound root must retain a neutral pivot");
}
for (const forbidden of ["parent", "locators", "inflate", "mirror", "cubes", "rotation"]) {
  if (boundBone?.[forbidden] !== undefined) {
    errors.push(`Bound root must not define ${forbidden}`);
  }
}
if (presentationBone?.parent !== "aspergillum_bound") {
  errors.push("Presentation bone must inherit directly from the proven bound root");
}
if (presentationBone?.binding !== undefined || presentationBone?.locators !== undefined || presentationBone?.cubes !== undefined) {
  errors.push("Presentation bone must contain only the perspective-neutral structural transform");
}
if (JSON.stringify(presentationBone?.pivot) !== JSON.stringify([-6, 24, 1])) {
  errors.push("Presentation pivot must coincide with the empirically calibrated dark-handle grip");
}
if (JSON.stringify(presentationBone?.rotation) !== JSON.stringify([25, 0, -12])) {
  errors.push("Presentation bone must retain the controlled structural pose");
}
if (actionBone?.parent !== "aspergillum_presentation"
  || JSON.stringify(actionBone?.pivot) !== JSON.stringify([-6, 24, 1])
  || actionBone?.cubes !== undefined
  || actionBone?.binding !== undefined) {
  errors.push("Action bone must be a neutral grip-centred child of the presentation bone");
}
if (handleBone?.parent !== "aspergillum_action" || sprinklerHeadBone?.parent !== "aspergillum_action") {
  errors.push("Handle and sprinkler head must inherit from the action bone");
}
if (handleBone?.locators !== undefined || sprinklerHeadBone?.locators !== undefined) {
  errors.push("The animation foundation must not introduce the locator prematurely");
}
const cubes = [...(handleBone?.cubes ?? []), ...(sprinklerHeadBone?.cubes ?? [])];
if (cubes.length !== 8) {
  errors.push("Handle and sprinkler head must preserve the eight real aspergillum cubes");
} else {
  const grip = [-6, 24, 1];
  const handleContainsGrip = grip.every(
    (coordinate, axis) => cubes[0].origin[axis] <= coordinate && cubes[0].origin[axis] + cubes[0].size[axis] >= coordinate,
  );
  if (!handleContainsGrip) errors.push("Dark handle must contain the empirically calibrated grip point");
  const minY = Math.min(...cubes.map((cube) => cube.origin[1]));
  const maxY = Math.max(...cubes.map((cube) => cube.origin[1] + cube.size[1]));
  const maxWidth = Math.max(...cubes.map((cube) => cube.size[0]));
  if (Math.abs(maxY - minY - 15.6) > 1e-6 || maxWidth > 5) {
    errors.push("Real mesh must preserve the validated hand-scale envelope");
  }
  if (cubes.some((cube) => cube.size.some((dimension) => dimension <= 0))) {
    errors.push("Real mesh must not contain zero-thickness or negative-size cubes");
  }
  if (cubes.some((cube) => !Array.isArray(cube.uv) || cube.uv.length !== 2)) {
    errors.push("Real mesh must use complete box UV mapping for every cube");
  }
}
const attachableDefinition = JSON.parse(attachableSource)?.["minecraft:attachable"]?.description;
const expectedAnimations = {
  hold_first_person: "animation.aspergillum.hold_first_person",
  hold_third_person: "animation.aspergillum.hold_third_person",
  sprinkle_first_person: "animation.aspergillum.action.sprinkle.first_person",
  sprinkle_third_person: "animation.aspergillum.action.sprinkle.third_person",
  action_controller: "controller.animation.aspergillum.action",
};
if (JSON.stringify(attachableDefinition?.animations) !== JSON.stringify(expectedAnimations)) {
  errors.push("Attachable must expose the frozen hold poses and perspective-specific action controller resources");
}
const expectedAnimateScript = [
  { hold_first_person: "context.is_first_person == 1.0" },
  { hold_third_person: "context.is_first_person == 0.0" },
  "action_controller",
];
if (JSON.stringify(attachableDefinition?.scripts?.animate) !== JSON.stringify(expectedAnimateScript)) {
  errors.push("Attachable must select one hold pose and continuously evaluate its action controller");
}
if (attachableDefinition?.materials?.default !== "entity") {
  errors.push("Pose-calibration attachable must use the opaque entity material");
}

const holdAnimations = JSON.parse(
  fs.readFileSync(path.join(packRoots[1], "animations", "aspergillum.hold.animation.json"), "utf8"),
)?.animations;
const firstPersonPose = holdAnimations?.["animation.aspergillum.hold_first_person"];
const thirdPersonPose = holdAnimations?.["animation.aspergillum.hold_third_person"];
if (JSON.stringify(firstPersonPose?.bones?.aspergillum_presentation?.rotation) !== JSON.stringify([180, 0, 0])) {
  errors.push("First-person pose must perform the controlled end-for-end inversion");
}
if (JSON.stringify(thirdPersonPose?.bones?.aspergillum_presentation?.position) !== JSON.stringify([5, -1.5, -2.25])) {
  errors.push("Third-person pose must apply only the measured grip translation");
}
if (JSON.stringify(thirdPersonPose?.bones?.aspergillum_presentation?.rotation) !== JSON.stringify([10, 0, 0])) {
  errors.push("Third-person pose must apply only the measured forward-pitch correction");
}
for (const [name, pose] of Object.entries({ firstPersonPose, thirdPersonPose })) {
  if (pose?.loop !== true || Object.keys(pose?.bones ?? {}).join() !== "aspergillum_presentation") {
    errors.push(`${name} must be a continuous presentation-bone-only pose`);
  }
  const transform = pose?.bones?.aspergillum_presentation ?? {};
  if (transform.scale !== undefined) {
    errors.push(`${name} must not add an unverified scale offset`);
  }
}
if (firstPersonPose?.bones?.aspergillum_presentation?.position !== undefined) {
  errors.push("The validated first-person pose must remain positionally frozen");
}

const actionAnimationPath = path.join(packRoots[1], "animations", "aspergillum.action.animation.json");
const actionAnimations = fs.existsSync(actionAnimationPath)
  ? JSON.parse(fs.readFileSync(actionAnimationPath, "utf8"))?.animations
  : undefined;
const loadAnimation = actionAnimations?.["animation.aspergillum.player.load"];
if (loadAnimation?.animation_length !== 0.8
  || loadAnimation?.override_previous_animation !== true
  || Object.keys(loadAnimation?.bones ?? {}).sort().join() !== "rightarm,rightitem") {
  errors.push("The accepted 16-tick loading choreography must remain unchanged");
}
const bodySprinkle = actionAnimations?.["animation.aspergillum.player.sprinkle.body"];
const firstPersonSprinkle = actionAnimations?.["animation.aspergillum.action.sprinkle.first_person"];
const thirdPersonSprinkle = actionAnimations?.["animation.aspergillum.action.sprinkle.third_person"];
if (bodySprinkle !== undefined) {
  errors.push("Sprinkle must leave player bones entirely to the native swing recovery");
}
for (const [name, animation] of Object.entries({ firstPersonSprinkle, thirdPersonSprinkle })) {
  if (animation?.animation_length !== 0.82 || Object.keys(animation?.bones ?? {}).join() !== "aspergillum_action") {
    errors.push(`${name} must settle by 0.82 seconds and target only aspergillum_action`);
  }
}

const actionControllerPath = path.join(packRoots[1], "animation_controllers", "aspergillum.animation_controllers.json");
const actionController = fs.existsSync(actionControllerPath)
  ? JSON.parse(fs.readFileSync(actionControllerPath, "utf8"))?.animation_controllers?.["controller.animation.aspergillum.action"]
  : undefined;
if (actionController?.initial_state !== "idle"
  || Object.keys(actionController?.states ?? {}).join() !== "idle,sprinkle,recovery") {
  errors.push("Attachable action controller must expose the controlled idle/sprinkle/recovery lifecycle");
}

const dropletPath = path.join(packRoots[1], "particles", "holy_water_droplet.particle.json");
if (!fs.existsSync(dropletPath)) {
  errors.push("Holy-water droplet particle definition is required");
} else {
  const dropletSource = fs.readFileSync(dropletPath, "utf8");
  const droplet = JSON.parse(dropletSource)?.particle_effect;
  const dropletComponents = droplet?.components ?? {};
  if (/q\.(?:particle_age|particle_lifetime)/.test(dropletSource)) {
    errors.push("Holy-water droplet must use particle variables instead of unsupported entity queries");
  }
  if (droplet?.description?.identifier !== "aspergillum:holy_water_droplet") {
    errors.push("Holy-water droplet particle identifier is invalid");
  }
  if (droplet?.description?.basic_render_parameters?.material !== "particles_alpha") {
    errors.push("Holy-water droplet must preserve the crisp particles_alpha presentation proven in 1.0.6");
  }
  if (droplet?.description?.basic_render_parameters?.texture !== "textures/particle/holy_water") {
    errors.push("Holy-water droplet must use its dedicated texture");
  }
  const billboard = dropletComponents["minecraft:particle_appearance_billboard"];
  if (billboard?.facing_camera_mode !== "rotate_xyz" || billboard?.direction !== undefined) {
    errors.push("Holy-water droplets must remain fully camera-facing like the proven 1.0.6 presentation");
  }
  if (JSON.stringify(billboard?.size) !== JSON.stringify([
    "0.042 * variable.aspergillum_scale",
    "0.1 * variable.aspergillum_scale",
  ])) {
    errors.push("Holy-water droplets must preserve the camera-safe 1.0.12 billboard dimensions");
  }
  const lifetime = dropletComponents["minecraft:particle_lifetime_expression"]?.max_lifetime;
  if (lifetime !== "1.05 + math.random(0.0, 0.35)") {
    errors.push("Holy-water droplets must preserve the proven 1.0.6 lifetime envelope");
  }
  const motion = dropletComponents["minecraft:particle_motion_dynamic"];
  if (JSON.stringify(motion?.linear_acceleration) !== JSON.stringify([0, -7.2, 0]) || motion?.linear_drag_coefficient !== 0.035) {
    errors.push("Holy-water droplets must preserve the proven 1.0.6 gravity and drag");
  }
  const collision = dropletComponents["minecraft:particle_motion_collision"];
  if (collision?.enabled !== true || collision?.expire_on_contact !== true || collision?.collision_radius !== 0.025) {
    errors.push("Holy-water droplets must preserve terrain collision and the 1.0.6 collision radius");
  }
  if (!dropletComponents["minecraft:particle_appearance_lighting"]) {
    errors.push("Holy-water droplets must respond to environmental lighting");
  }
  const interpolant = dropletComponents["minecraft:particle_appearance_tinting"]?.color?.interpolant;
  if (interpolant !== "variable.particle_age / variable.particle_lifetime") {
    errors.push("Holy-water droplet fade must use supported particle lifetime variables");
  }
}

const itemDefinition = JSON.parse(
  fs.readFileSync(path.join(packRoots[0], "items", "aspergillum.item.json"), "utf8"),
);
const itemComponents = itemDefinition?.["minecraft:item"]?.components;
if (itemComponents?.["minecraft:allow_off_hand"] !== false) {
  errors.push("Direct rightItem binding requires off-hand use to remain disabled");
}
if (itemComponents?.["minecraft:swing_duration"]?.value !== itemComponents?.["minecraft:cooldown"]?.duration) {
  errors.push("Aspergillum swing duration and attack cooldown must remain synchronized");
}

const compiledScript = fs.readFileSync(path.join(packRoots[0], "scripts", "main.js"), "utf8");
if (!compiledScript.includes("playAnimation")
  || !compiledScript.includes("animation.aspergillum.player.load")) {
  errors.push("Compiled script must preserve the accepted one-shot loading animation");
}
if (compiledScript.includes("animation.aspergillum.player.sprinkle.body")
  || compiledScript.includes("playSprinkleAnimation")) {
  errors.push("Compiled sprinkle flow must not layer a late scripted animation over the native arm swing");
}
if (!compiledScript.includes("spawnParticle") || !compiledScript.includes("aspergillum:holy_water_droplet")) {
  errors.push("Compiled script must emit the namespaced holy-water droplet particle");
}
if (!compiledScript.includes("dropletCount: 36") || !compiledScript.includes("pulseCount: 6")) {
  errors.push("Compiled spray must emit the complete 36-droplet burst");
}
if (!compiledScript.includes("horizontalSpread: 0.26")
  || !compiledScript.includes("verticalCenter: 0.035")
  || !compiledScript.includes("verticalSpread: 0.055")) {
  errors.push("Compiled spray must retain the wide-horizontal, narrow-vertical fan");
}
if (!compiledScript.includes("steeringResponsiveness: 0.8") || !compiledScript.includes("maximumTurnDegrees: 30")) {
  errors.push("Compiled spray must retain the controlled camera-steering profile");
}
if (!compiledScript.includes("transportSprayBasis") || !compiledScript.includes('phase: "reserved"')) {
  errors.push("Compiled spray must preserve transported steering and reserve-before-release semantics");
}
if (!compiledScript.includes("random.splash")) {
  errors.push("Compiled spray must synchronize the water release sound");
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
  "packs/resource/animations/aspergillum.action.animation.json",
  "packs/resource/animations/aspergillum.hold.animation.json",
  "packs/resource/animation_controllers/aspergillum.animation_controllers.json",
  "packs/resource/particles/holy_water_droplet.particle.json",
  "packs/resource/render_controllers/aspergillum.render_controllers.json",
];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing generated asset: ${relative}`);

const entityTexturePath = path.join(packRoots[1], "textures", "entity", "aspergillum.png");
const particleTexturePath = path.join(packRoots[1], "textures", "particle", "holy_water.png");
for (const file of walk(path.join(root, "packs", "resource", "textures")).filter((entry) => entry.endsWith(".png"))) {
  try {
    const image = PNG.sync.read(fs.readFileSync(file));
    const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
    if (!powerOfTwo(image.width) || !powerOfTwo(image.height)) errors.push(`Non-power-of-two texture: ${path.relative(root, file)}`);
    if (file === entityTexturePath) {
      for (let alpha = 3; alpha < image.data.length; alpha += 4) {
        if (image.data[alpha] !== 255) {
          errors.push("Held aspergillum texture must be fully opaque");
          break;
        }
      }
    }
    if (file === particleTexturePath) {
      let visiblePixels = 0;
      for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset + 3] === 0) continue;
        visiblePixels += 1;
        if (image.data[offset + 2] < image.data[offset + 1] || image.data[offset + 1] < image.data[offset]) {
          errors.push("Holy-water texture must remain blue/cyan and must not regress to green mist");
          break;
        }
      }
      if (visiblePixels < 40) errors.push("Holy-water droplet texture has insufficient visible coverage");
    }
  } catch (error) {
    errors.push(`Unreadable PNG ${path.relative(root, file)}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${jsonCount} JSON files, ${uuids.length} UUIDs, and all generated textures.`);
