import { STANDARD_SPRAY_PROFILE, type SprayProfile } from "./spray-profile";

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(value: Vector3, factor: number): Vector3 {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor };
}

export function normalize(value: Vector3): Vector3 {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length < 1e-6) return { x: 0, y: 0, z: 1 };
  return scale(value, 1 / length);
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function leastAlignedAxis(direction: Vector3): Vector3 {
  const ax = Math.abs(direction.x);
  const ay = Math.abs(direction.y);
  const az = Math.abs(direction.z);
  if (ax <= ay && ax <= az) return { x: 1, y: 0, z: 0 };
  if (ay <= ax && ay <= az) return { x: 0, y: 1, z: 0 };
  return { x: 0, y: 0, z: 1 };
}

export interface SprayBasis {
  readonly forward: Vector3;
  readonly right: Vector3;
  readonly up: Vector3;
}

function length(value: Vector3): number {
  return Math.hypot(value.x, value.y, value.z);
}

function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function projectOntoPlane(value: Vector3, normal: Vector3): Vector3 {
  return subtract(value, scale(normal, dot(value, normal)));
}

function rotateAroundAxis(value: Vector3, axisInput: Vector3, angle: number): Vector3 {
  const axis = normalize(axisInput);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(scale(value, cosine), scale(cross(axis, value), sine)),
    scale(axis, dot(axis, value) * (1 - cosine)),
  );
}

export function createSprayBasis(forwardInput: Vector3, rightHint?: Vector3): SprayBasis {
  const forward = normalize(forwardInput);
  let right = rightHint === undefined ? undefined : projectOntoPlane(rightHint, forward);
  if (right === undefined || length(right) < 1e-6) {
    const worldUp = { x: 0, y: 1, z: 0 };
    const reference = Math.abs(dot(forward, worldUp)) < 0.95 ? worldUp : leastAlignedAxis(forward);
    right = cross(forward, reference);
  }
  right = normalize(right);
  const up = normalize(cross(right, forward));
  return { forward, right, up };
}

export function transportSprayBasis(previous: SprayBasis, nextForwardInput: Vector3): SprayBasis {
  const nextForward = normalize(nextForwardInput);
  const cosine = Math.max(-1, Math.min(1, dot(previous.forward, nextForward)));
  if (cosine > 1 - 1e-6) return createSprayBasis(nextForward, previous.right);

  let axis = cross(previous.forward, nextForward);
  if (length(axis) < 1e-6) axis = previous.up;
  const transportedRight = rotateAroundAxis(previous.right, axis, Math.acos(cosine));
  return createSprayBasis(nextForward, transportedRight);
}

export function steerDirection(
  previousInput: Vector3,
  targetInput: Vector3,
  responsiveness = STANDARD_SPRAY_PROFILE.steeringResponsiveness,
  maximumTurnDegrees = STANDARD_SPRAY_PROFILE.maximumTurnDegrees,
): Vector3 {
  const previous = normalize(previousInput);
  const target = normalize(targetInput);
  const cosine = Math.max(-1, Math.min(1, dot(previous, target)));
  const angle = Math.acos(cosine);
  if (angle < 1e-5) return target;

  const safeResponsiveness = Math.max(0, Math.min(1, responsiveness));
  const maximumTurn = Math.max(0, maximumTurnDegrees) * Math.PI / 180;
  const step = Math.min(angle * safeResponsiveness, maximumTurn);
  if (step < 1e-6) return previous;

  let axis = cross(previous, target);
  if (Math.hypot(axis.x, axis.y, axis.z) < 1e-6) axis = cross(previous, leastAlignedAxis(previous));
  axis = normalize(axis);
  const cosineStep = Math.cos(step);
  const sineStep = Math.sin(step);
  const axisProjection = dot(axis, previous) * (1 - cosineStep);
  const perpendicular = cross(axis, previous);
  return normalize({
    x: previous.x * cosineStep + perpendicular.x * sineStep + axis.x * axisProjection,
    y: previous.y * cosineStep + perpendicular.y * sineStep + axis.y * axisProjection,
    z: previous.z * cosineStep + perpendicular.z * sineStep + axis.z * axisProjection,
  });
}

export function aspergillumTipOrigin(
  head: Vector3,
  direction: Vector3,
  rightHint?: Vector3,
  profile: SprayProfile = STANDARD_SPRAY_PROFILE,
): Vector3 {
  const basis = createSprayBasis(direction, rightHint);
  const view = basis.forward;
  const right = basis.right;

  return add(head, {
    x: view.x * profile.forwardOriginOffset + right.x * profile.rightOriginOffset,
    y: profile.verticalOriginOffset
      + view.y * profile.pitchedOriginOffset
      + right.y * profile.rightOriginOffset,
    z: view.z * profile.forwardOriginOffset + right.z * profile.rightOriginOffset,
  });
}

export function isInsideCone(
  origin: Vector3,
  direction: Vector3,
  point: Vector3,
  range: number,
  halfAngleDegrees: number,
): boolean {
  const offset = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const distance = Math.hypot(offset.x, offset.y, offset.z);
  if (distance < 1e-6 || distance > range) return false;
  const cosine = dot(normalize(direction), scale(offset, 1 / distance));
  return cosine >= Math.cos((halfAngleDegrees * Math.PI) / 180);
}

export function deterministicDropletDirections(
  direction: Vector3,
  count = STANDARD_SPRAY_PROFILE.dropletCount,
  rightHint?: Vector3,
  profile: SprayProfile = STANDARD_SPRAY_PROFILE,
): Vector3[] {
  const { forward, right, up } = createSprayBasis(direction, rightHint);

  return Array.from({ length: count }, (_, index) => {
    const horizontalUnit = ((((index + 0.5) * 0.6180339887498949) % 1) * 2) - 1;
    const verticalBand = ((index % 6) - 2.5) / 2.5;
    const horizontalSpread = horizontalUnit * profile.horizontalSpread;
    const verticalSpread = profile.verticalCenter + verticalBand * profile.verticalSpread;
    return normalize(add(forward, add(scale(right, horizontalSpread), scale(up, verticalSpread))));
  });
}

export function dropletIndicesForFrame(dropletCount: number, frameCount: number, frameIndex: number): number[] {
  if (dropletCount <= 0 || frameCount <= 0 || frameIndex < 0 || frameIndex >= frameCount) return [];
  const baseSize = Math.floor(dropletCount / frameCount);
  const remainder = dropletCount % frameCount;
  const first = frameIndex * baseSize + Math.min(frameIndex, remainder);
  const size = baseSize + (frameIndex < remainder ? 1 : 0);
  return Array.from({ length: size }, (_, offset) => first + offset);
}

export function deterministicDropletSpeed(
  dropletIndex: number,
  profile: SprayProfile = STANDARD_SPRAY_PROFILE,
): number {
  if (dropletIndex < 0) return 0;
  return profile.minimumSpeed + (dropletIndex % profile.speedVariants) * profile.speedStep;
}
