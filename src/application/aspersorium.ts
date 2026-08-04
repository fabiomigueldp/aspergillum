import {
  Block,
  BlockPermutation,
  BlockComponentPlayerInteractEvent,
  ItemStack,
  Player,
  system,
} from "@minecraft/server";
import { loadFromAspersorium, MAX_CHARGES } from "../domain/aspergillum";
import { ASPERSORIUM_BLOCK, DOCKED_STATE, WATER_LEVEL_STATE } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  createAspergillum,
  getMainhand,
  giveOrDrop,
  initializeAspergillum,
  isAspergillum,
  readAspergillumInstanceId,
  readAspergillumState,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
import {
  getLoadingBlockOwner,
  startLoadingSession,
  type LoadingSession,
} from "../infrastructure/loading-session";
import { action } from "../infrastructure/messaging";
import { commitMainhandAndBlock } from "../infrastructure/minecraft-transaction";

function getNumberState(block: Block, state: string): number {
  const value = block.permutation.getAllStates()[state];
  return typeof value === "number" ? value : 0;
}

function getBooleanState(block: Block, state: string): boolean {
  return block.permutation.getAllStates()[state] === true;
}

function withState(permutation: BlockPermutation, state: string, value: number | boolean): BlockPermutation {
  // The generated API typings enumerate only vanilla state names; Bedrock supports
  // namespaced custom states at runtime, so this cast is intentionally isolated here.
  const withCustomState = permutation.withState as unknown as (
    name: string,
    stateValue: number | boolean | string,
  ) => BlockPermutation;
  return withCustomState.call(permutation, state, value);
}

function setState(block: Block, state: string, value: number | boolean): void {
  block.setPermutation(withState(block.permutation, state, value));
}

function isWithinLoadingRange(player: Player, block: Block): boolean {
  const dx = player.location.x - (block.location.x + 0.5);
  const dy = player.location.y - (block.location.y + 0.5);
  const dz = player.location.z - (block.location.z + 0.5);
  return dx * dx + dy * dy + dz * dz <= 36;
}

function fillFromBucket(player: Player, block: Block): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  if (getNumberState(block, WATER_LEVEL_STATE) >= MAX_CHARGES) {
    action(player, "§7A caldeirinha já está cheia.", "§7The aspersorium is already full.");
    return;
  }

  setState(block, WATER_LEVEL_STATE, MAX_CHARGES);
  if (!policies.creative) setMainhand(player, new ItemStack("minecraft:bucket", 1));
  player.playSound("bucket.empty_water", { pitch: 1.08, volume: 0.75 });
  action(player, "§bCaldeirinha cheia", "§bAspersorium filled");
}

function commitLoading(player: Player, session: LoadingSession): void {
  if (!player.isValid || player.id !== session.playerId) return;
  if (player.dimension.id !== session.dimensionId || player.selectedSlotIndex !== session.slot) return;
  const block = player.dimension.getBlock(session.blockLocation);
  if (block === undefined || !block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return;
  if (!isWithinLoadingRange(player, block) || getBooleanState(block, DOCKED_STATE)) return;

  const currentItem = getMainhand(player);
  if (!isAspergillum(currentItem)) return;
  if (readAspergillumInstanceId(currentItem) !== session.itemInstanceId) return;
  const currentLevel = getNumberState(block, WATER_LEVEL_STATE);
  if (currentLevel <= 0 || currentLevel !== session.expectedWaterLevel) return;

  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const result = loadFromAspersorium(readAspergillumState(currentItem), currentLevel, policies.waterPolicy);
  if (result.transferred === 0) return;

  const originalPermutation = block.permutation;
  const updatedPermutation = withState(originalPermutation, WATER_LEVEL_STATE, result.nextWater);
  const updatedItem = writeAspergillumState(currentItem, result.state, player);
  if (!commitMainhandAndBlock(player, currentItem, updatedItem, block, originalPermutation, updatedPermutation)) {
    action(player, "§cO carregamento foi cancelado com segurança.", "§cLoading was safely cancelled.");
    return;
  }
  player.playSound("cauldron.takewater", { pitch: 1.32, volume: 0.78 });
  action(
    player,
    policies.creative ? "§bÁgua benta: ∞ §7• Criativo" : `§b${result.state.charges}§7/3 cargas`,
    policies.creative ? "§bHoly water: ∞ §7• Creative" : `§b${result.state.charges}§7/3 charges`,
  );
}

function loadItem(player: Player, block: Block): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  const initialItem = initializeAspergillum(rawItem, player);
  setMainhand(player, initialItem);
  const instanceId = readAspergillumInstanceId(initialItem);
  if (instanceId === undefined) return;
  const initialLevel = getNumberState(block, WATER_LEVEL_STATE);
  const preview = loadFromAspersorium(readAspergillumState(initialItem), initialLevel, policies.waterPolicy);
  if (preview.transferred === 0) {
    action(
      player,
      initialLevel === 0 ? "§7A caldeirinha está vazia." : "§7O aspersório já está carregado.",
      initialLevel === 0 ? "§7The aspersorium is empty." : "§7The aspergillum is already loaded.",
    );
    return;
  }

  const started = startLoadingSession(
    {
      playerId: player.id,
      itemInstanceId: instanceId,
      slot: player.selectedSlotIndex,
      dimensionId: player.dimension.id,
      blockLocation: block.location,
      expectedWaterLevel: initialLevel,
    },
    (session) => commitLoading(player, session),
    10,
  );
  if (started.status === "player_busy") {
    action(player, "§7O aspersório já está sendo carregado.", "§7The aspergillum is already loading.");
    return;
  }
  if (started.status === "block_busy") {
    action(player, "§7A caldeirinha já está sendo usada.", "§7The aspersorium is already in use.");
    return;
  }

  player.playSound("armor.equip_chain", { pitch: 1.18, volume: 0.32 });
  action(player, "§7Carregando o aspersório…", "§7Loading the aspergillum…");
}

function dockItem(player: Player, block: Block): void {
  const item = getMainhand(player);
  if (!isAspergillum(item) || getBooleanState(block, DOCKED_STATE)) return;
  const itemState = readAspergillumState(item);
  const level = getNumberState(block, WATER_LEVEL_STATE);
  const returned = Math.min(MAX_CHARGES, level + itemState.charges);
  setState(block, WATER_LEVEL_STATE, returned);
  setState(block, DOCKED_STATE, true);
  setMainhand(player, undefined);
  player.playSound("armor.equip_chain", { pitch: 0.92, volume: 0.58 });
  action(player, "§7Aspersório acomodado na caldeirinha.", "§7Aspergillum placed in the aspersorium.");
}

function undockItem(player: Player, block: Block): void {
  if (!getBooleanState(block, DOCKED_STATE)) return;
  setState(block, DOCKED_STATE, false);
  giveOrDrop(player, createAspergillum(0, player));
  player.playSound("armor.equip_chain", { pitch: 1.12, volume: 0.55 });
  action(player, "§7Aspersório retirado.", "§7Aspergillum retrieved.");
}

export function handleAspersoriumInteraction(event: BlockComponentPlayerInteractEvent): void {
  const player = event.player;
  if (player === undefined) return;

  system.run(() => {
    if (!player.isValid || !event.block.isValid) return;
    const block = event.block;
    const item = getMainhand(player);
    const lockOwner = getLoadingBlockOwner(block.dimension.id, block.location);
    if (lockOwner !== undefined) {
      action(
        player,
        lockOwner === player.id ? "§7O aspersório já está sendo carregado." : "§7A caldeirinha já está sendo usada.",
        lockOwner === player.id ? "§7The aspergillum is already loading." : "§7The aspersorium is already in use.",
      );
      return;
    }

    if (item?.typeId === "minecraft:water_bucket") {
      fillFromBucket(player, block);
      return;
    }
    if (getBooleanState(block, DOCKED_STATE)) {
      undockItem(player, block);
      return;
    }
    if (isAspergillum(item)) {
      if (player.isSneaking) dockItem(player, block);
      else loadItem(player, block);
      return;
    }
    action(player, "§7Use um balde d'água ou o aspersório.", "§7Use a water bucket or the aspergillum.");
  });
}
