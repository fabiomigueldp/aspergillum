import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const resource = path.join(root, "packs", "resource");
const errors = [];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(resource, relative), "utf8"));
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
if (attachable?.particle_effects?.holy_water_release !== "aspergillum:holy_water_release") {
  errors.push("Missing attachable particle alias holy_water_release");
}
for (const soundAlias of ["sprinkle_prepare", "sprinkle_release"]) {
  if (typeof attachable?.sound_effects?.[soundAlias] !== "string") {
    errors.push(`Missing attachable sound alias ${soundAlias}`);
  }
}

const animations = readJson("animations/aspergillum.action.animation.json").animations;
for (const perspective of ["first_person", "third_person"]) {
  const animation = animations?.[`animation.aspergillum.action.sprinkle.${perspective}`];
  const release = animation?.particle_effects?.["0.25"];
  if (release?.effect !== "holy_water_release"
    || release?.locator !== "aspergillum_tip"
    || release?.bind_to_actor !== false) {
    errors.push(`${perspective} release must fire once at 0.25s from the detached tip locator`);
  }
  const sounds = animation?.sound_effects;
  if (sounds?.["0.08"]?.effect !== "sprinkle_prepare"
    || sounds?.["0.25"]?.effect !== "sprinkle_release"
    || sounds?.["0.25"]?.locator !== "aspergillum_tip") {
    errors.push(`${perspective} sounds must share the prepare/release contract`);
  }
  if (Object.keys(animation?.particle_effects ?? {}).length !== 1) {
    errors.push(`${perspective} must add one release bridge, not a duplicate ballistic fan`);
  }
}

const droplet = readJson("particles/holy_water_droplet.particle.json").particle_effect;
const dropletComponents = droplet?.components ?? {};
const billboard = dropletComponents["minecraft:particle_appearance_billboard"];
if (billboard?.facing_camera_mode !== "direction_y"
  || billboard?.direction?.mode !== "derive_from_velocity") {
  errors.push("Ballistic droplets must be velocity-oriented");
}
const collision = dropletComponents["minecraft:particle_motion_collision"];
if (collision?.events?.length !== 1
  || collision.events[0]?.event !== "aspergillum:micro_splash"
  || collision?.expire_on_contact !== true) {
  errors.push("Each ballistic droplet must produce one discreet impact event");
}

const release = readJson("particles/holy_water_release.particle.json").particle_effect;
const releaseComponents = release?.components ?? {};
const localSpace = releaseComponents["minecraft:emitter_local_space"];
if (release?.description?.identifier !== "aspergillum:holy_water_release"
  || releaseComponents["minecraft:emitter_rate_instant"]?.num_particles !== 4
  || localSpace?.position !== false
  || localSpace?.rotation !== true
  || localSpace?.velocity !== false) {
  errors.push("Release bridge must be a four-particle, orientation-only locator burst");
}
if (releaseComponents["minecraft:particle_lifetime_expression"]?.max_lifetime !== "math.random(0.12, 0.18)") {
  errors.push("Release bridge must stay short enough not to become a second spray");
}

const splash = readJson("particles/holy_water_micro_splash.particle.json").particle_effect;
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
if (!compiled.includes("spawnParticle") || compiled.includes("random.splash")) {
  errors.push("Script must keep the ballistic fallback without duplicating the locator-timed release sound");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Validated locator hierarchy, hybrid release bridge, velocity-oriented droplets, impacts, and custom sounds.");
