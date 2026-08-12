import { AVATAR_ACTIONS } from './avatar-contract.js';

export function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function hermiteBlend(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function loadEnvelope(time) {
  const value = Math.max(0, Number(time) || 0);
  if (value <= 0.04 || value >= 0.78) return 0;
  if (value < 0.46) return hermiteBlend((value - 0.04) / 0.42);
  if (value <= 0.54) return 1;
  return 1 - hermiteBlend((value - 0.54) / 0.24);
}

function sinDegrees(degrees) {
  return Math.sin((degrees * Math.PI) / 180);
}

export function evaluateVanillaAttack(attackTime) {
  const progress = clamp01(attackTime);
  if (progress <= 0 || progress >= 1) {
    return {
      body: [0, 0, 0],
      leftArm: [0, 0, 0],
      rightArm: [0, 0, 0],
      phase: 0,
    };
  }

  const phase = sinDegrees((1 - ((1 - progress) ** 4)) * 180);
  const secondary = sinDegrees(progress * 180);
  const swing = (phase * 1.2) + secondary;
  return {
    body: [0, sinDegrees(360 * Math.sqrt(progress)) * 5, 0],
    leftArm: [-swing * 10, 0, 0],
    rightArm: [-swing * 30, (90 * phase) - 30, 0],
    phase,
  };
}

/**
 * Vanilla Bedrock first-person swing from player_firstperson.animation.json.
 * It is a viewmodel curve and must not be replaced by the third-person attack
 * applied to the full player rig.
 */
export function evaluateFirstPersonAttack(attackTime) {
  const progress = clamp01(attackTime);
  if (progress <= 0 || progress >= 1) {
    return { position: [0, 0, 0], rotation: [0, 0, 0], factor: 0 };
  }

  const factor = sinDegrees((1 - progress) * 180);
  const lateral = sinDegrees(factor * progress * 112);
  const arc = sinDegrees(factor * ((1 - progress) ** 2) * 200);
  const depth = sinDegrees(factor * progress * 120);
  const rotationArc = sinDegrees(factor * ((1 - progress) ** 2) * 280);
  return {
    position: [
      Math.max(-7, -15.5 * lateral) * lateral,
      (arc * 7.5) - (factor * progress * 15),
      depth * 1.75,
    ],
    rotation: [rotationArc * -60, rotationArc * 40, rotationArc * 20],
    factor,
  };
}

export function evaluateRecoveryBridge(attackTime, perspective = 'third') {
  const progress = clamp01(attackTime);
  if (perspective === 'first' || progress <= 0 || progress >= 1) return 0;
  return 30 * hermiteBlend((progress - 0.5) / 0.5);
}

export function evaluateAvatarPose({ action = 'idle', time = 0, perspective = 'third' } = {}) {
  const definition = AVATAR_ACTIONS[action] ?? AVATAR_ACTIONS.idle;
  const boundedTime = definition.duration > 0
    ? Math.min(Math.max(0, Number(time) || 0), definition.duration)
    : 0;
  const firstPerson = perspective === 'first';
  const holding = firstPerson ? 0 : -18;
  const pose = {
    action: definition.id,
    time: boundedTime,
    duration: definition.duration,
    attackTime: 0,
    loadWeight: firstPerson ? 0.32 : 1,
    bones: {
      body: { rotation: [0, 0, 0] },
      leftArm: { rotation: [0, 0, 0] },
      rightArm: firstPerson
        ? { position: [13.5, -10, 12], rotation: [95, -45, 115] }
        : { rotation: [holding, 0, 0] },
      ...(firstPerson ? { rightItem: { position: [0, 0, -1], rotation: [0, 0, 0] } } : {}),
    },
  };

  if (definition.id === 'load') {
    const envelope = loadEnvelope(boundedTime) * pose.loadWeight;
    pose.bones.rightArm.rotation = pose.bones.rightArm.rotation.map(
      (value, index) => value + ([-20, -4, 3][index] * envelope),
    );
    return pose;
  }

  if (definition.id === 'sprinkle') {
    const attackTime = definition.duration > 0 ? boundedTime / definition.duration : 0;
    pose.attackTime = attackTime;
    if (firstPerson) {
      const vanilla = evaluateFirstPersonAttack(attackTime);
      pose.bones.rightArm.position = pose.bones.rightArm.position.map(
        (value, index) => value + vanilla.position[index],
      );
      pose.bones.rightArm.rotation = pose.bones.rightArm.rotation.map(
        (value, index) => value + vanilla.rotation[index],
      );
      return pose;
    }
    const vanilla = evaluateVanillaAttack(attackTime);
    const bridge = evaluateRecoveryBridge(attackTime, perspective);
    pose.bones.body.rotation = vanilla.body;
    pose.bones.leftArm.rotation = vanilla.leftArm;
    pose.bones.rightArm.rotation = [
      holding + vanilla.rightArm[0],
      vanilla.rightArm[1] + bridge,
      vanilla.rightArm[2],
    ];
  }

  return pose;
}

export function vectorFromAnimationValue(value, fallback = [0, 0, 0]) {
  if (Array.isArray(value)) return [0, 1, 2].map((index) => Number(value[index]) || 0);
  if (value && typeof value === 'object') {
    return vectorFromAnimationValue(value.post ?? value.pre ?? fallback, fallback);
  }
  return [...fallback];
}

export function sampleAnimationChannel(channel, time, length) {
  if (Array.isArray(channel)) return vectorFromAnimationValue(channel);
  if (!channel || typeof channel !== 'object') return [0, 0, 0];

  const keyframes = Object.entries(channel)
    .map(([key, value]) => ({ time: Number(key), value }))
    .filter(({ time: keyTime }) => Number.isFinite(keyTime))
    .sort((left, right) => left.time - right.time);
  if (!keyframes.length) return vectorFromAnimationValue(channel);
  if (keyframes.length === 1) return vectorFromAnimationValue(keyframes[0].value);

  const sampledTime = Math.min(Math.max(0, Number(time) || 0), Math.max(0, Number(length) || 0));
  if (sampledTime <= keyframes[0].time) return vectorFromAnimationValue(keyframes[0].value);
  if (sampledTime >= keyframes.at(-1).time) return vectorFromAnimationValue(keyframes.at(-1).value);

  let nextIndex = keyframes.findIndex(({ time: keyTime }) => keyTime >= sampledTime);
  if (nextIndex < 1) nextIndex = 1;
  const previous = keyframes[nextIndex - 1];
  const next = keyframes[nextIndex];
  const progress = clamp01((sampledTime - previous.time) / Math.max(next.time - previous.time, Number.EPSILON));
  const mode = previous.value?.lerp_mode ?? next.value?.lerp_mode;
  const from = vectorFromAnimationValue(previous.value);
  const to = vectorFromAnimationValue(next.value);
  if (mode === 'step') return from;
  if (mode === 'catmullrom') {
    const before = vectorFromAnimationValue(keyframes[Math.max(0, nextIndex - 2)].value);
    const after = vectorFromAnimationValue(keyframes[Math.min(keyframes.length - 1, nextIndex + 1)].value);
    const t2 = progress * progress;
    const t3 = t2 * progress;
    return from.map((value, index) => 0.5 * (
      (2 * value)
      + (-before[index] + to[index]) * progress
      + ((2 * before[index]) - (5 * value) + (4 * to[index]) - after[index]) * t2
      + (-before[index] + (3 * value) - (3 * to[index]) + after[index]) * t3
    ));
  }
  return from.map((value, index) => value + ((to[index] - value) * progress));
}
