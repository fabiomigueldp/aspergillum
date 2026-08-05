import type { Player, Vector3 } from "@minecraft/server";
import { MICRO_SPLASH_PARTICLE } from "../infrastructure/constants";

export const LOAD_SPLASH_OFFSETS = [
  { x: 0.45, y: 0.64, z: 0.48 },
  { x: 0.54, y: 0.66, z: 0.53 },
] as const satisfies readonly Vector3[];

export function presentLoadedAspergillum(player: Player, blockLocation: Vector3): void {
  for (const offset of LOAD_SPLASH_OFFSETS) {
    try {
      player.dimension.spawnParticle(MICRO_SPLASH_PARTICLE, {
        x: blockLocation.x + offset.x,
        y: blockLocation.y + offset.y,
        z: blockLocation.z + offset.z,
      });
    } catch (error) {
      // The state transfer is authoritative; this deliberately tiny wet cue is not.
      console.warn(`[Aspergillum] Unable to present loading splash for ${player.id}: ${String(error)}`);
      return;
    }
  }
}
