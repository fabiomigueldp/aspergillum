import type { Player } from "@minecraft/server";

export const LOAD_ANIMATION = "animation.aspergillum.player.load";
export const SPRINKLE_RECOVERY_BRIDGE_ANIMATION = "animation.aspergillum.player.sprinkle.recovery_bridge";
export const THURIBLE_INCENSE_ANIMATION = "animation.thurible.player.incense";

function playActionAnimation(player: Player, animation: string, blendOutTime = 0.1): void {
  try {
    player.playAnimation(animation, { blendOutTime });
  } catch (error) {
    // Presentation failures must never change authoritative charges or water.
    console.warn(`[Aspergillum] Unable to play ${animation} for ${player.id}: ${String(error)}`);
  }
}

export function playLoadingAnimation(player: Player): void {
  // The visible dip settles by 0.8 s; the remaining expression-only tail
  // closes the native third-person attack seam before this defensive fade.
  playActionAnimation(player, LOAD_ANIMATION, 0.05);
}

export function playSprinkleRecoveryBridge(player: Player): void {
  // The expression is already neutral before the finite animation expires;
  // this fade is only defensive cleanup and never owns the recovery curve.
  playActionAnimation(player, SPRINKLE_RECOVERY_BRIDGE_ANIMATION, 0.05);
}

export function playThuribleIncenseAnimation(player: Player): void {
  // The attachable owns the vessel pendulum and smoke. This animation only
  // gives the player arm the restrained impulse that starts the swing.
  playActionAnimation(player, THURIBLE_INCENSE_ANIMATION, 0.08);
}
