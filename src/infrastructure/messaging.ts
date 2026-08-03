import type { Player } from "@minecraft/server";

export function isPortuguese(player: Player): boolean {
  return player.clientSystemInfo.locale?.toLowerCase().startsWith("pt") ?? false;
}

export function action(player: Player, pt: string, en: string): void {
  player.onScreenDisplay.setActionBar(isPortuguese(player) ? pt : en);
}
