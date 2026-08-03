const FULL_CIRCLE = 360;
const SIXTEEN_WAY_STEP = FULL_CIRCLE / 16;

export function yawToSixteenWayRotation(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const normalized = ((yaw % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
  return Math.round(normalized / SIXTEEN_WAY_STEP) % 16;
}
