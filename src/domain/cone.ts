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

export function aspergillumTipOrigin(head: Vector3, direction: Vector3): Vector3 {
  const view = normalize(direction);
  const horizontalLength = Math.hypot(view.x, view.z);
  const right = horizontalLength > 1e-5
    ? { x: -view.z / horizontalLength, y: 0, z: view.x / horizontalLength }
    : { x: 1, y: 0, z: 0 };

  return add(head, {
    x: view.x * 0.72 + right.x * 0.3,
    y: -0.42 + view.y * 0.24,
    z: view.z * 0.72 + right.z * 0.3,
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

export function deterministicDropletDirections(direction: Vector3, count = 18): Vector3[] {
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
    const radius = 0.035 + 0.16 * Math.sqrt((index + 0.5) / count);
    return normalize(add(forward, add(scale(right, Math.cos(phase) * radius), scale(up, Math.sin(phase) * radius + 0.055))));
  });
}
