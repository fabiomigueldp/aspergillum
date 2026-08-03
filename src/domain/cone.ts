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

export function aspergillumTipOrigin(head: Vector3, direction: Vector3, releaseProgress = 0.5): Vector3 {
  const view = normalize(direction);
  const horizontalLength = Math.hypot(view.x, view.z);
  const right = horizontalLength > 1e-5
    ? { x: -view.z / horizontalLength, y: 0, z: view.x / horizontalLength }
    : { x: 1, y: 0, z: 0 };
  const progress = Math.max(0, Math.min(1, releaseProgress));
  const forwardDistance = 0.62 + progress * 0.12;
  const lateralDistance = 0.36 - progress * 0.12;
  const lift = -0.1 + Math.sin(progress * Math.PI) * 0.06;

  return add(head, add(scale(view, forwardDistance), add(scale(right, lateralDistance), { x: 0, y: lift, z: 0 })));
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

export function deterministicDropletDirections(direction: Vector3, count = 30): Vector3[] {
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
    const phase = index * 2.399963229728653;
    const radius = 0.03 + 0.14 * Math.sqrt((index + 0.5) / count);
    return normalize(add(forward, add(scale(right, Math.cos(phase) * radius), scale(up, Math.sin(phase) * radius + 0.11))));
  });
}

export function dropletIndicesForFrame(dropletCount: number, frameCount: number, frameIndex: number): number[] {
  if (dropletCount <= 0 || frameCount <= 0 || frameIndex < 0 || frameIndex >= frameCount) return [];
  return Array.from({ length: dropletCount }, (_, index) => index).filter((index) => index % frameCount === frameIndex);
}

export function deterministicDropletSpeed(dropletIndex: number, frameCount: number, frameIndex: number): number {
  if (dropletIndex < 0 || frameCount <= 0 || frameIndex < 0 || frameIndex >= frameCount) return 0;
  const speedBand = Math.floor(dropletIndex / frameCount) % 5;
  return 11.4 + speedBand * 0.38 + frameIndex * 0.06;
}
