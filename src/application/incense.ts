import {
  ItemComponentTypes,
  type ItemStack,
  type Player,
  system,
} from "@minecraft/server";
import { THURIBLE_ITEM } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import { getMainhand } from "../infrastructure/item-state";
import { playThuribleIncenseAnimation } from "../presentation/animation-coordinator";

const INCENSE_GATE_TICKS = 21;
const lastIncenseTick = new Map<string, number>();

export function isThurible(item: ItemStack | undefined): item is ItemStack {
  return item?.typeId === THURIBLE_ITEM;
}

export function clearThuriblePlayerState(playerId: string): void {
  lastIncenseTick.delete(playerId);
}

export function tryIncense(player: Player): void {
  if (resolvePlayerPolicies(player).denied) return;

  const item = getMainhand(player);
  if (!isThurible(item)) return;

  const now = system.currentTick;
  const previousTick = lastIncenseTick.get(player.id);
  if (previousTick !== undefined && now - previousTick < INCENSE_GATE_TICKS) return;

  const cooldown = item.getComponent(ItemComponentTypes.Cooldown);
  if (cooldown === undefined) {
    console.warn(`[Aspergillum] Thurible cooldown is unavailable for ${player.id}`);
    return;
  }

  try {
    if (cooldown.getCooldownTicksRemaining(player) <= 0) cooldown.startCooldown(player);
  } catch (error) {
    console.warn(`[Aspergillum] Unable to start thurible cooldown for ${player.id}: ${String(error)}`);
    return;
  }

  lastIncenseTick.set(player.id, now);
  playThuribleIncenseAnimation(player);
}
