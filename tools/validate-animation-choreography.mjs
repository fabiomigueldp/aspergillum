import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const animationPath = path.join(root, "packs", "resource", "animations", "aspergillum.action.animation.json");
const controllerPath = path.join(root, "packs", "resource", "animation_controllers", "aspergillum.animation_controllers.json");
const profilePath = path.join(root, "src", "domain", "spray-profile.ts");
const itemPath = path.join(root, "packs", "behavior", "items", "aspergillum.item.json");
const errors = [];

const animations = JSON.parse(fs.readFileSync(animationPath, "utf8")).animations;
const controllers = JSON.parse(fs.readFileSync(controllerPath, "utf8")).animation_controllers;
const body = animations["animation.aspergillum.player.sprinkle.body"];
const firstPerson = animations["animation.aspergillum.action.sprinkle.first_person"];
const thirdPerson = animations["animation.aspergillum.action.sprinkle.third_person"];
const controller = controllers["controller.animation.aspergillum.action"];

function vector(value) {
  if (Array.isArray(value)) return value.map(Number);
  if (value && Array.isArray(value.post)) return value.post.map(Number);
  if (value && Array.isArray(value.pre)) return value.pre.map(Number);
  return undefined;
}

function add(a, b) {
  return a.map((value, index) => value + b[index]);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function scale(a, factor) {
  return a.map((value) => value * factor);
}

function length(a) {
  return Math.hypot(...a);
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return p1.map((_, axis) => 0.5 * (
    2 * p1[axis]
    + (-p0[axis] + p2[axis]) * t
    + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2
    + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3
  ));
}

function parseChannel(channel, label) {
  const frames = Object.entries(channel ?? {})
    .map(([time, frame]) => ({ time: Number(time), value: vector(frame), mode: frame?.lerp_mode ?? "linear" }))
    .sort((a, b) => a.time - b.time);
  if (frames.length === 0 || frames.some((frame) => !Number.isFinite(frame.time) || frame.value?.length !== 3)) {
    errors.push(`${label} has malformed keyframes`);
  }
  return frames;
}

function sample(frames, time) {
  if (time <= frames[0].time) return frames[0].value;
  if (time >= frames.at(-1).time) return frames.at(-1).value;
  const index = frames.findIndex((frame) => frame.time >= time) - 1;
  const current = frames[index];
  const next = frames[index + 1];
  const progress = (time - current.time) / (next.time - current.time);
  if (current.mode === "catmullrom" || next.mode === "catmullrom") {
    return catmullRom(
      frames[Math.max(0, index - 1)].value,
      current.value,
      next.value,
      frames[Math.min(frames.length - 1, index + 2)].value,
      progress,
    );
  }
  return add(current.value, scale(subtract(next.value, current.value), progress));
}

function isNeutral(value, tolerance) {
  return value.every((component) => Math.abs(component) <= tolerance);
}

function angleDegrees(a, b) {
  const denominator = length(a) * length(b);
  if (denominator <= 1e-9) return 0;
  const cosine = Math.max(-1, Math.min(1, a.reduce((sum, value, axis) => sum + value * b[axis], 0) / denominator));
  return Math.acos(cosine) * 180 / Math.PI;
}

function motionMetrics(frames, duration, minimumSpeed, heroTime) {
  const step = 1 / 120;
  const samples = [];
  for (let index = 0; index <= Math.ceil(duration / step); index += 1) {
    const time = Math.min(duration, index * step);
    samples.push({ time, value: sample(frames, time) });
  }
  const velocities = samples.slice(1).map((entry, index) => ({
    time: entry.time,
    value: scale(subtract(entry.value, samples[index].value), 1 / step),
  }));
  const accelerations = velocities.slice(1).map((entry, index) => ({
    time: entry.time,
    value: scale(subtract(entry.value, velocities[index].value), 1 / step),
  }));
  const maximumVelocity = Math.max(...velocities.map((entry) => length(entry.value)));
  const settledSpeed = Math.max(minimumSpeed, maximumVelocity * 0.15);
  let maximumDirectionChange = 0;
  for (let index = 1; index < velocities.length; index += 1) {
    if (length(velocities[index - 1].value) < settledSpeed || length(velocities[index].value) < settledSpeed) continue;
    maximumDirectionChange = Math.max(maximumDirectionChange, angleDegrees(velocities[index - 1].value, velocities[index].value));
  }
  let activeReversals = 0;
  let previousSign = 0;
  for (const velocity of velocities) {
    if (velocity.time > heroTime) break;
    const dominant = velocity.value[0];
    if (Math.abs(dominant) < settledSpeed) continue;
    const sign = Math.sign(dominant);
    if (previousSign !== 0 && sign !== previousSign) activeReversals += 1;
    previousSign = sign;
  }
  return {
    maximumVelocity,
    maximumAcceleration: Math.max(...accelerations.map((entry) => length(entry.value))),
    maximumDirectionChange,
    activeReversals,
  };
}

function validateChannel({
  animation,
  bone,
  channelName,
  label,
  maximumMagnitude,
  endpointTolerance,
  maximumFrameDelta,
  maximumVelocity,
  maximumAcceleration,
  minimumSpeed,
  maximumDirectionChange,
  heroTime,
}) {
  const channel = animation?.bones?.[bone]?.[channelName];
  const frames = parseChannel(channel, label);
  if (frames.length === 0) return;
  if (!isNeutral(frames[0].value, endpointTolerance) || !isNeutral(frames.at(-1).value, endpointTolerance)) {
    errors.push(`${label} must begin and end at the neutral pose`);
  }
  if (Math.abs(frames.at(-1).time - animation.animation_length) > 1e-6) {
    errors.push(`${label} must settle at the animation endpoint`);
  }
  let maximum = 0;
  for (let index = 0; index <= Math.ceil(animation.animation_length * 120); index += 1) {
    const value = sample(frames, Math.min(animation.animation_length, index / 120));
    if (value.some((component) => !Number.isFinite(component))) errors.push(`${label} produced a non-finite sample`);
    maximum = Math.max(maximum, length(value));
  }
  if (maximum > maximumMagnitude + 1e-6) {
    errors.push(`${label} exceeds its motion envelope (${maximum.toFixed(3)} > ${maximumMagnitude})`);
  }
  for (let time = 1 / 30; time <= animation.animation_length + 1e-6; time += 1 / 30) {
    const delta = length(subtract(sample(frames, Math.min(time, animation.animation_length)), sample(frames, time - 1 / 30)));
    if (delta > maximumFrameDelta + 1e-6) {
      errors.push(`${label} changes ${delta.toFixed(3)} units/degrees in one 30 FPS frame`);
      break;
    }
  }
  const metrics = motionMetrics(frames, animation.animation_length, minimumSpeed, heroTime);
  if (metrics.maximumVelocity > maximumVelocity + 1e-6) {
    errors.push(`${label} exceeds maximum velocity (${metrics.maximumVelocity.toFixed(2)} > ${maximumVelocity})`);
  }
  if (metrics.maximumAcceleration > maximumAcceleration + 1e-6) {
    errors.push(`${label} exceeds maximum acceleration (${metrics.maximumAcceleration.toFixed(2)} > ${maximumAcceleration})`);
  }
  if (metrics.maximumDirectionChange > maximumDirectionChange + 1e-6) {
    errors.push(`${label} changes velocity direction by ${metrics.maximumDirectionChange.toFixed(2)}° without settling`);
  }
  if (metrics.activeReversals > 1) {
    errors.push(`${label} contains ${metrics.activeReversals} principal reversals before its hero pose`);
  }
  return metrics;
}

if (firstPerson?.animation_length !== 0.82 || thirdPerson?.animation_length !== 0.82) {
  errors.push("Sprinkle choreography must settle at 0.82 seconds and leave the cooldown buffer untouched");
}
if (body !== undefined) errors.push("Sprinkle must not script player bones; the native swing owns the complete arm recovery");
for (const [label, animation] of [["first-person action", firstPerson], ["third-person action", thirdPerson]]) {
  if (Object.keys(animation?.bones ?? {}).join() !== "aspergillum_action") {
    errors.push(`${label} must animate only aspergillum_action`);
  }
}

const summaries = [];
for (const [label, animation] of [["first-person", firstPerson], ["third-person", thirdPerson]]) {
  summaries.push([`${label} rotation`, validateChannel({
    animation,
    bone: "aspergillum_action",
    channelName: "rotation",
    label: `${label}/action rotation`,
    maximumMagnitude: 18,
    endpointTolerance: 0.1,
    maximumFrameDelta: 10,
    maximumVelocity: 300,
    maximumAcceleration: 7500,
    minimumSpeed: 5,
    maximumDirectionChange: 90,
    heroTime: label === "first-person" ? 0.39 : 0.47,
  })]);
  summaries.push([`${label} position`, validateChannel({
    animation,
    bone: "aspergillum_action",
    channelName: "position",
    label: `${label}/action position`,
    maximumMagnitude: 0.5,
    endpointTolerance: 0.01,
    maximumFrameDelta: 0.5,
    maximumVelocity: 15,
    maximumAcceleration: 500,
    minimumSpeed: 0.05,
    maximumDirectionChange: 90,
    heroTime: label === "first-person" ? 0.39 : 0.47,
  })]);
}

const states = controller?.states;
if (controller?.initial_state !== "idle" || Object.keys(states ?? {}).join() !== "idle,sprinkle,recovery") {
  errors.push("Attachable action controller requires the idle -> sprinkle -> recovery state machine");
}
for (const stateName of ["idle", "sprinkle", "recovery"]) {
  const state = states?.[stateName];
  if (state?.blend_transition !== 0.08 || state?.blend_via_shortest_path !== true) {
    errors.push(`${stateName} must crossfade over 0.08 seconds via the shortest rotation path`);
  }
}
const controllerSource = fs.readFileSync(controllerPath, "utf8");
if (!controllerSource.includes("q.is_cooldown_category('aspergillum_sprinkle', 'slot.weapon.mainhand')")
  || !controllerSource.includes("q.cooldown_time_remaining('slot.weapon.mainhand')")) {
  errors.push("Attachable action controller must be gated by the valid main-hand sprinkle cooldown");
}

const profileSource = fs.readFileSync(profilePath, "utf8");
if (!profileSource.includes("releaseDelayTicks: 5") || !profileSource.includes("actionDurationTicks: 18")) {
  errors.push("Release must commit on tick 5 while the authoritative action remains 18 ticks long");
}
const item = JSON.parse(fs.readFileSync(itemPath, "utf8"))["minecraft:item"];
if (item?.components?.["minecraft:swing_duration"]?.value !== 0.9
  || item?.components?.["minecraft:cooldown"]?.duration !== 0.9) {
  errors.push("Vanilla swing and valid cooldown must remain synchronized at 0.9 seconds");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const summary = summaries
  .filter(([, metrics]) => metrics !== undefined)
  .map(([label, metrics]) => `${label}: v=${metrics.maximumVelocity.toFixed(1)}, a=${metrics.maximumAcceleration.toFixed(1)}, turn=${metrics.maximumDirectionChange.toFixed(1)}°, reversals=${metrics.activeReversals}`)
  .join("; ");
console.log("Validated native-only arm recovery, perspective-specific item choreography, cooldown gating, and release continuity.");
console.log(`Choreography metrics (120 Hz): ${summary}`);
