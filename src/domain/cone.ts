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

export function steerDirection(
  previousInput: Vector3,
  targetInput: Vector3,
  responsiveness = 0.8,
  maximumTurnDegrees = 30,
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

export function aspergillumTipOrigin(head: Vector3, direction: Vector3): Vector3 {
  const view = normalize(direction);
  const horizontalLength = Math.hypot(view.x, view.z);
  const right = horizontalLength > 1e-5
    ? { x: -view.z / horizontalLength, y: 0, z: view.x / horizontalLength }
    : { x: 1, y: 0, z: 0 };

  return add(head, {
    x: view.x * 0.55 + right.x * 0.48,
    y: -0.15 + view.y * 0.2,
    z: view.z * 0.55 + right.z * 0.48,
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

export function deterministicDropletDirections(direction: Vector3, count = 36): Vector3[] {
  const forward = normalize(direction);
  const worldUp: Vector3 = Math.abs(forward.y) > 0.95 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const right = normalize({
    x: forward.y * worldUp.z - forward.z * worldUp.y,
    y: forward.z * worldUp.x - forward.x * worldUp.z,
    z: forward.x * worldUp.y - forward.y * worldUp.x,
  });
  const up = normalize({
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  });

  return Array.from({ length: count }, (_, index) => {
    const horizontalUnit = ((((index + 0.5) * 0.6180339887498949) % 1) * 2) - 1;
    const verticalBand = ((index % 6) - 2.5) / 2.5;
    const horizontalSpread = horizontalUnit * 0.26;
    const verticalSpread = 0.035 + verticalBand * 0.055;
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

export function deterministicDropletSpeed(dropletIndex: number): number {
  if (dropletIndex < 0) return 0;
  return 12.7 + (dropletIndex % 5) * 0.32;
}
