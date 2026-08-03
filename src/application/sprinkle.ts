import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemComponentTypes,
  Player,
  system,
} from "@minecraft/server";
import { canSprinkle, consumeCharge } from "../domain/aspergillum";
import { getMainhand, isAspergillum, readAspergillumState, writeAspergillumState } from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

const lastSprinkleTick = new Map<string, number>();

export function trySprinkle(player: Player): void {
  const item = getMainhand(player);
  if (!isAspergillum(item)) return;

  const now = system.currentTick;
  if (!canSprinkle(lastSprinkleTick.get(player.id), now)) return;

  const state = readAspergillumState(item);
  const next = consumeCharge(state);
  if (next === undefined) {
    lastSprinkleTick.set(player.id, now);
    player.playSound("random.click", { pitch: 0.72, volume: 0.45 });
    action(player, "§7O aspersório está vazio. Use-o numa caldeirinha com água.", "§7The aspergillum is empty. Use it on a filled aspersorium.");
    return;
  }

  lastSprinkleTick.set(player.id, now);
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  equippable?.setEquipment(EquipmentSlot.Mainhand, writeAspergillumState(item, next, player));
  item.getComponent(ItemComponentTypes.Cooldown)?.startCooldown(player);

  player.playSound("armor.equip_chain", { pitch: 1.42, volume: 0.42 });
  action(player, `§b${next.charges}§7/3 cargas restantes`, `§b${next.charges}§7/3 charges remaining`);
}
