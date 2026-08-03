import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemComponentTypes,
  MolangVariableMap,
  Player,
  system,
} from "@minecraft/server";
import { canSprinkle, consumeCharge } from "../domain/aspergillum";
import {
  aspergillumTipOrigin,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
} from "../domain/cone";
import { DROPLET_PARTICLE } from "../infrastructure/constants";
import { getMainhand, isAspergillum, readAspergillumState, writeAspergillumState } from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

const lastSprinkleTick = new Map<string, number>();
const SPRAY_DROPLET_COUNT = 30;
const SPRAY_FRAME_COUNT = 6;
const SPRAY_RELEASE_DELAY_TICKS = 4;

function emitWaterFrame(player: Player, frameIndex: number): void {
  if (!player.isValid) return;

  const direction = player.getViewDirection();
  const releaseProgress = frameIndex / (SPRAY_FRAME_COUNT - 1);
  const origin = aspergillumTipOrigin(player.getHeadLocation(), direction, releaseProgress);
  const directions = deterministicDropletDirections(direction, SPRAY_DROPLET_COUNT);

  for (const dropletIndex of dropletIndicesForFrame(SPRAY_DROPLET_COUNT, SPRAY_FRAME_COUNT, frameIndex)) {
    const dropletDirection = directions[dropletIndex];
    if (!dropletDirection) continue;
    const variables = new MolangVariableMap();
    const speed = deterministicDropletSpeed(dropletIndex, SPRAY_FRAME_COUNT, frameIndex);
    variables.setSpeedAndDirection("variable.aspergillum_motion", speed, dropletDirection);
    variables.setFloat("variable.aspergillum_scale", 0.72 + (dropletIndex % 5) * 0.07);
    player.dimension.spawnParticle(DROPLET_PARTICLE, origin, variables);
  }
}

function scheduleWaterSpray(player: Player): void {
  for (let frameIndex = 0; frameIndex < SPRAY_FRAME_COUNT; frameIndex += 1) {
    system.runTimeout(() => {
      if (!player.isValid) return;
      if (frameIndex === 0) player.playSound("random.splash", { pitch: 1.38, volume: 0.58 });
      emitWaterFrame(player, frameIndex);
    }, SPRAY_RELEASE_DELAY_TICKS + frameIndex);
  }
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

  player.playSound("armor.equip_chain", { pitch: 1.42, volume: 0.42 });
  scheduleWaterSpray(player);
  action(player, `§b${next.charges}§7/3 cargas restantes`, `§b${next.charges}§7/3 charges remaining`);
}
