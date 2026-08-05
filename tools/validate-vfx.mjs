import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const root = path.resolve(import.meta.dirname, "..");
const resource = path.join(root, "packs", "resource");
const errors = [];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(resource, relative), "utf8"));
}

const approvedWaterPalettes = {
  droplet: {
    "0.0": [0.28, 0.62, 0.84, 1.0],
    "0.55": [0.18, 0.5, 0.75, 0.98],
    "0.88": [0.11, 0.38, 0.65, 0.86],
    "1.0": [0.09, 0.32, 0.58, 0.0],
  },
  release: {
    "0.0": [0.34, 0.68, 0.88, 1.0],
    "0.6": [0.22, 0.56, 0.78, 0.94],
    "1.0": [0.12, 0.4, 0.64, 0.0],
  },
  splash: {
    "0.0": [0.26, 0.6, 0.82, 1.0],
    "0.62": [0.16, 0.46, 0.7, 0.9],
    "1.0": [0.1, 0.34, 0.58, 0.0],
  },
};

function validateWaterColor(components, palette, label) {
  const gradient = components?.["minecraft:particle_appearance_tinting"]?.color?.gradient;
  if (JSON.stringify(gradient) !== JSON.stringify(palette)) {
    errors.push(`${label} must preserve the approved cool-blue water palette`);
  }
  for (const rgba of Object.values(gradient ?? {})) {
    if (!Array.isArray(rgba) || rgba.length !== 4) {
      errors.push(`${label} must use explicit RGBA arrays instead of ambiguous eight-digit hex colors`);
      break;
    }
    if (rgba.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 1)) {
      errors.push(`${label} RGBA channels must remain finite normalized numbers`);
      break;
    }
    if (rgba[2] <= rgba[1] || rgba[1] <= rgba[0]) {
      errors.push(`${label} must keep blue dominant over green and red at every lifetime key`);
      break;
    }
  }
  if (components?.["minecraft:particle_appearance_lighting"] !== undefined) {
    errors.push(`${label} must keep its hue independent from local colored lighting`);
  }
}

const particleTexture = PNG.sync.read(
  fs.readFileSync(path.join(resource, "textures", "particle", "holy_water.png")),
);
for (let offset = 0; offset < particleTexture.data.length; offset += 4) {
  if (particleTexture.data[offset + 3] === 0) continue;
  if (particleTexture.data[offset] !== 245
    || particleTexture.data[offset + 1] !== 249
    || particleTexture.data[offset + 2] !== 255) {
    errors.push("Holy-water source sprite must remain neutral so tint gradients own the final hue");
    break;
  }
}

const geometry = readJson("models/entity/aspergillum.geo.json")["minecraft:geometry"]?.[0];
const bones = geometry?.bones ?? [];
const sprayAim = bones.find((bone) => bone.name === "spray_aim");
if (sprayAim?.parent !== "sprinkler_head") errors.push("spray_aim must inherit sprinkler_head");
if (JSON.stringify(sprayAim?.locators?.aspergillum_tip) !== JSON.stringify([-6, 37.8, 1])) {
  errors.push("aspergillum_tip must remain one model unit beyond the perforated cap");
}
if (sprayAim?.cubes !== undefined || sprayAim?.binding !== undefined) {
  errors.push("spray_aim is an orientation/locator bone only");
}

const attachable = readJson("attachables/aspergillum.attachable.json")["minecraft:attachable"]?.description;
if (attachable?.particle_effects !== undefined || attachable?.sound_effects !== undefined) {
  errors.push("Attachable must not own release audio or particles after the authoritative commit migration");
}

const animations = readJson("animations/aspergillum.action.animation.json").animations;
for (const perspective of ["first_person", "third_person"]) {
  const animation = animations?.[`animation.aspergillum.action.sprinkle.${perspective}`];
  if (animation?.particle_effects !== undefined || animation?.sound_effects !== undefined) {
    errors.push(`${perspective} must remain animation-only; script release commit owns VFX and audio`);
  }
}

const droplet = readJson("particles/holy_water_droplet.particle.json").particle_effect;
const dropletComponents = droplet?.components ?? {};
validateWaterColor(dropletComponents, approvedWaterPalettes.droplet, "Ballistic droplets");
const billboard = dropletComponents["minecraft:particle_appearance_billboard"];
if (billboard?.facing_camera_mode !== "rotate_xyz"
  || billboard?.direction !== undefined
  || JSON.stringify(billboard?.size) !== JSON.stringify([
    "0.042 * variable.aspergillum_scale",
    "0.1 * variable.aspergillum_scale",
  ])) {
  errors.push("Ballistic droplets must preserve the physically approved visible billboard profile");
}
const collision = dropletComponents["minecraft:particle_motion_collision"];
if (collision?.events?.length !== 1
  || collision.events[0]?.event !== "aspergillum:micro_splash"
  || collision?.expire_on_contact !== true) {
  errors.push("Each ballistic droplet must produce one discreet impact event");
}

const release = readJson("particles/holy_water_release.particle.json").particle_effect;
const releaseComponents = release?.components ?? {};
validateWaterColor(releaseComponents, approvedWaterPalettes.release, "Release bridge");
if (release?.description?.identifier !== "aspergillum:holy_water_release"
  || releaseComponents["minecraft:emitter_rate_instant"]?.num_particles !== 4
  || releaseComponents["minecraft:emitter_local_space"] !== undefined) {
  errors.push("Release bridge must be a server-authorized world-space effect");
}
if (!String(releaseComponents["minecraft:particle_initial_speed"]).includes("variable.aspergillum_motion.speed")
  || releaseComponents["minecraft:particle_lifetime_expression"]?.max_lifetime !== "math.random(0.26, 0.38)"
  || JSON.stringify(releaseComponents["minecraft:particle_appearance_billboard"]?.size) !== JSON.stringify([0.028, 0.06])
  || releaseComponents["minecraft:particle_appearance_billboard"]?.facing_camera_mode !== "rotate_xyz") {
  errors.push("Release bridge must remain slow, readable, camera-facing, and subordinate to the main fan");
}

const splash = readJson("particles/holy_water_micro_splash.particle.json").particle_effect;
validateWaterColor(splash?.components, approvedWaterPalettes.splash, "Micro-splash");
if (splash?.description?.identifier !== "aspergillum:holy_water_micro_splash"
  || splash?.components?.["minecraft:emitter_rate_instant"]?.num_particles !== 1) {
  errors.push("Micro-splash must remain a single-particle impact accent");
}

const sounds = readJson("sounds/sound_definitions.json").sound_definitions;
if (!sounds?.["aspergillum.sprinkle.prepare"] || !sounds?.["aspergillum.sprinkle.release"]) {
  errors.push("Custom sprinkle sound definitions are incomplete");
}

const compiled = fs.readFileSync(path.join(root, "packs", "behavior", "scripts", "main.js"), "utf8");
if (!compiled.includes("dropletCount: 36")
  || !compiled.includes("pulseCount: 6")
  || !compiled.includes("steeringResponsiveness: 0.8")
  || !compiled.includes("maximumTurnDegrees: 30")) {
  errors.push("Hybrid VFX must preserve the proven 36/6 steering emitter");
}
if (!compiled.includes("spawnParticle")
  || !compiled.includes("aspergillum:holy_water_release")
  || compiled.includes("random.splash")) {
  errors.push("Script must own the authorized bridge and ballistic fan without vanilla splash duplication");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Validated the locator hierarchy, server-authorized world-space bridge, cool-blue droplets, and impacts.");
