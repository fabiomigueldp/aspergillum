import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemComponentTypes,
  MolangVariableMap,
  Player,
  system,
  type Vector3,
} from "@minecraft/server";
import { canSprinkle, resolveSprinkle } from "../domain/aspergillum";
import {
  aspergillumTipOrigin,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
  normalize,
  steerDirection,
} from "../domain/cone";
import { DROPLET_PARTICLE } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  getMainhand,
  initializeAspergillum,
  isAspergillum,
  readAspergillumInstanceId,
  readAspergillumState,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

const lastSprinkleTick = new Map<string, number>();
const SPRAY_DROPLET_COUNT = 36;
const SPRAY_FRAME_COUNT = 6;
const SPRAY_RELEASE_DELAY_TICKS = 4;

interface SpraySchedule {
  readonly itemInstanceId: string;
  readonly dimensionId: string;
  readonly runIds: number[];
  steeringDirection: Vector3 | undefined;
}

const spraySchedules = new Map<string, SpraySchedule>();

function hasAuthorizedItem(player: Player, itemInstanceId: string, dimensionId: string): boolean {
  if (!player.isValid || player.dimension.id !== dimensionId) return false;
  const item = getMainhand(player);
  return isAspergillum(item) && readAspergillumInstanceId(item) === itemInstanceId;
}

function emitWaterFrame(player: Player, schedule: SpraySchedule, frameIndex: number): void {
  if (!hasAuthorizedItem(player, schedule.itemInstanceId, schedule.dimensionId)) return;
  const targetDirection = player.getViewDirection();
  schedule.steeringDirection = schedule.steeringDirection === undefined
    ? normalize(targetDirection)
    : steerDirection(schedule.steeringDirection, targetDirection);
  const origin = aspergillumTipOrigin(player.getHeadLocation(), schedule.steeringDirection);
  const directions = deterministicDropletDirections(schedule.steeringDirection, SPRAY_DROPLET_COUNT);

  for (const dropletIndex of dropletIndicesForFrame(SPRAY_DROPLET_COUNT, SPRAY_FRAME_COUNT, frameIndex)) {
    const dropletDirection = directions[dropletIndex];
    if (!dropletDirection) continue;
    const variables = new MolangVariableMap();
    const speed = deterministicDropletSpeed(dropletIndex);
    variables.setSpeedAndDirection("variable.aspergillum_motion", speed, dropletDirection);
    variables.setFloat("variable.aspergillum_scale", 0.78 + (dropletIndex % 4) * 0.07);
    player.dimension.spawnParticle(DROPLET_PARTICLE, origin, variables);
  }
}

export function cancelWaterSpray(playerId: string): void {
  const schedule = spraySchedules.get(playerId);
  if (schedule === undefined) return;
  spraySchedules.delete(playerId);
  for (const runId of schedule.runIds) system.clearRun(runId);
}

function scheduleWaterSpray(player: Player, itemInstanceId: string): void {
  cancelWaterSpray(player.id);
  const schedule: SpraySchedule = {
    itemInstanceId,
    dimensionId: player.dimension.id,
    runIds: [],
    steeringDirection: undefined,
  };
  spraySchedules.set(player.id, schedule);
  schedule.runIds.push(system.runTimeout(() => {
    if (!hasAuthorizedItem(player, schedule.itemInstanceId, schedule.dimensionId)) {
      cancelWaterSpray(player.id);
      return;
    }
    player.playSound("random.splash", { pitch: 1.38, volume: 0.58 });
    emitWaterFrame(player, schedule, 0);
    for (let frameIndex = 1; frameIndex < SPRAY_FRAME_COUNT; frameIndex += 1) {
      schedule.runIds.push(system.runTimeout(() => {
        if (!hasAuthorizedItem(player, schedule.itemInstanceId, schedule.dimensionId)) {
          cancelWaterSpray(player.id);
          return;
        }
        emitWaterFrame(player, schedule, frameIndex);
        if (frameIndex === SPRAY_FRAME_COUNT - 1 && spraySchedules.get(player.id) === schedule) {
          spraySchedules.delete(player.id);
        }
      }, frameIndex));
    }
  }, SPRAY_RELEASE_DELAY_TICKS));
}

export function clearSprinklePlayerState(playerId: string): void {
  lastSprinkleTick.delete(playerId);
  cancelWaterSpray(playerId);
}

function presentChargeState(player: Player, charges: number, creative: boolean): void {
  if (creative) {
    action(player, "§bÁgua benta: ∞ §7• Criativo", "§bHoly water: ∞ §7• Creative");
    return;
  }
  action(player, `§b${charges}§7/3 cargas restantes`, `§b${charges}§7/3 charges remaining`);
}

export function trySprinkle(player: Player): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  const item = initializeAspergillum(rawItem, player);
  setMainhand(player, item);
  const itemInstanceId = readAspergillumInstanceId(item);
  if (itemInstanceId === undefined) return;

  const now = system.currentTick;
  if (!canSprinkle(lastSprinkleTick.get(player.id), now)) return;

  const state = readAspergillumState(item);
  const resolution = resolveSprinkle(state, policies.chargePolicy);
  if (!resolution.allowed) {
    lastSprinkleTick.set(player.id, now);
    player.playSound("random.click", { pitch: 0.72, volume: 0.45 });
    action(player, "§7O aspersório está vazio. Use-o numa caldeirinha com água.", "§7The aspergillum is empty. Use it on a filled aspersorium.");
    return;
  }

  lastSprinkleTick.set(player.id, now);
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  const updatedItem = writeAspergillumState(item, resolution.state, player);
  equippable?.setEquipment(EquipmentSlot.Mainhand, updatedItem);
  updatedItem.getComponent(ItemComponentTypes.Cooldown)?.startCooldown(player);

  player.playSound("armor.equip_chain", { pitch: 1.42, volume: 0.42 });
  scheduleWaterSpray(player, itemInstanceId);
  presentChargeState(player, resolution.state.charges, policies.creative);
}
