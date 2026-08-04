import { GameMode, Player } from "@minecraft/server";
import type { ChargePolicy, WaterPolicy } from "../domain/aspergillum";

export interface PlayerPolicies {
  readonly denied: boolean;
  readonly creative: boolean;
  readonly chargePolicy: ChargePolicy;
  readonly waterPolicy: WaterPolicy;
}

export function resolvePlayerPolicies(player: Player): PlayerPolicies {
  try {
    const mode = player.getGameMode();
    if (mode === GameMode.Creative) {
      return { denied: false, creative: true, chargePolicy: "retain", waterPolicy: "retain" };
    }
    if (mode === GameMode.Spectator) {
      return { denied: true, creative: false, chargePolicy: "consume", waterPolicy: "consume" };
    }
  } catch (error) {
    console.warn(`[Aspergillum] Unable to read game mode for ${player.id}: ${String(error)}`);
  }
  return { denied: false, creative: false, chargePolicy: "consume", waterPolicy: "consume" };
}
