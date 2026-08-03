import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemComponentTypes,
  MolangVariableMap,
  Player,
  system,
} from "@minecraft/server";
import { canSprinkle, consumeCharge } from "../domain/aspergillum";
import { aspergillumTipOrigin, deterministicDropletDirections } from "../domain/cone";
import { DROPLET_PARTICLE } from "../infrastructure/constants";
import { getMainhand, isAspergillum, readAspergillumState, writeAspergillumState } from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

const lastSprinkleTick = new Map<string, number>();

function emitWater(player: Player): void {
  if (!player.isValid) return;
  const direction = player.getViewDirection();
  const origin = aspergillumTipOrigin(player.getHeadLocation(), direction);

  deterministicDropletDirections(direction, 24).forEach((dropletDirection, index) => {
    const variables = new MolangVariableMap();
    variables.setSpeedAndDirection("variable.aspergillum_motion", 11.5 + (index % 5) * 0.32, dropletDirection);
    variables.setFloat("variable.aspergillum_scale", 0.72 + (index % 4) * 0.09);
    player.dimension.spawnParticle(DROPLET_PARTICLE, origin, variables);
  });
}

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

  player.playAnimation("animation.aspergillum.player.sprinkle", {
    blendOutTime: 0.18,
    stopExpression: "q.is_sneaking && 0",
  });
  player.playSound("armor.equip_chain", { pitch: 1.42, volume: 0.42 });
  system.runTimeout(() => {
    if (!player.isValid) return;
    player.playSound("random.splash", { pitch: 1.38, volume: 0.58 });
    emitWater(player);
  }, 4);
  action(player, `§b${next.charges}§7/3 cargas restantes`, `§b${next.charges}§7/3 charges remaining`);
}
