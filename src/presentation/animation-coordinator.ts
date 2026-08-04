import type { Player } from "@minecraft/server";

export const LOAD_ANIMATION = "animation.aspergillum.player.load";
export const SPRINKLE_ANIMATION = "animation.aspergillum.player.sprinkle.body";

function playActionAnimation(player: Player, animation: string): void {
  try {
    player.playAnimation(animation, { blendOutTime: 0.1 });
  } catch (error) {
    // Presentation failures must never change authoritative charges or water.
    console.warn(`[Aspergillum] Unable to play ${animation} for ${player.id}: ${String(error)}`);
  }
}

export function playLoadingAnimation(player: Player): void {
  playActionAnimation(player, LOAD_ANIMATION);
}

export function playSprinkleAnimation(player: Player): void {
  playActionAnimation(player, SPRINKLE_ANIMATION);
}
