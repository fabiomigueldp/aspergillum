import type { Player } from "@minecraft/server";

export const LOAD_ANIMATION = "animation.aspergillum.player.load";
export const SPRINKLE_RECOVERY_BRIDGE_ANIMATION = "animation.aspergillum.player.sprinkle.recovery_bridge";

function playActionAnimation(player: Player, animation: string, blendOutTime = 0.1): void {
  try {
    player.playAnimation(animation, { blendOutTime });
  } catch (error) {
    // Presentation failures must never change authoritative charges or water.
    console.warn(`[Aspergillum] Unable to play ${animation} for ${player.id}: ${String(error)}`);
  }
}

export function playLoadingAnimation(player: Player): void {
  playActionAnimation(player, LOAD_ANIMATION);
}

export function playSprinkleRecoveryBridge(player: Player): void {
  // The expression is already neutral before the finite animation expires;
  // this fade is only defensive cleanup and never owns the recovery curve.
  playActionAnimation(player, SPRINKLE_RECOVERY_BRIDGE_ANIMATION, 0.05);
}
