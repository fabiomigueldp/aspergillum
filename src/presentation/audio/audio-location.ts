import type { Vector3 } from "@minecraft/server";

export function aspersoriumAcousticCenter(location: Vector3): Vector3 {
  return { x: location.x + 0.5, y: location.y + 0.62, z: location.z + 0.5 };
}
