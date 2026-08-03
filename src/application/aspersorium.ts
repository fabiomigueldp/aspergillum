import {
  Block,
  BlockPermutation,
  BlockComponentPlayerInteractEvent,
  EntityComponentTypes,
  EquipmentSlot,
  GameMode,
  ItemStack,
  Player,
  system,
} from "@minecraft/server";
import { loadFromAspersorium, MAX_CHARGES } from "../domain/aspergillum";
import { ASPERSORIUM_BLOCK, DOCKED_STATE, WATER_LEVEL_STATE } from "../infrastructure/constants";
import {
  createAspergillum,
  getMainhand,
  giveOrDrop,
  isAspergillum,
  readAspergillumState,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

function getNumberState(block: Block, state: string): number {
  const value = block.permutation.getAllStates()[state];
  return typeof value === "number" ? value : 0;
}

function getBooleanState(block: Block, state: string): boolean {
  return block.permutation.getAllStates()[state] === true;
}

function setState(block: Block, state: string, value: number | boolean): void {
  // The generated API typings enumerate only vanilla state names; Bedrock supports
  // namespaced custom states at runtime, so this cast is intentionally isolated here.
  const withCustomState = block.permutation.withState as unknown as (
    name: string,
    stateValue: number | boolean | string,
  ) => BlockPermutation;
  block.setPermutation(withCustomState.call(block.permutation, state, value));
}

function fillFromBucket(player: Player, block: Block): void {
  if (getNumberState(block, WATER_LEVEL_STATE) >= MAX_CHARGES) {
    action(player, "§7A caldeirinha já está cheia.", "§7The aspersorium is already full.");
    return;
  }

  setState(block, WATER_LEVEL_STATE, MAX_CHARGES);
  if (player.getGameMode() !== GameMode.Creative) setMainhand(player, new ItemStack("minecraft:bucket", 1));
  player.playSound("bucket.empty_water", { pitch: 1.08, volume: 0.75 });
  action(player, "§bCaldeirinha cheia", "§bAspersorium filled");
}

function loadItem(player: Player, block: Block): void {
  const initialItem = getMainhand(player);
  if (!isAspergillum(initialItem)) return;
  const initialLevel = getNumberState(block, WATER_LEVEL_STATE);
  const preview = loadFromAspersorium(readAspergillumState(initialItem), initialLevel);
  if (preview.waterConsumed === 0) {
    action(
      player,
      initialLevel === 0 ? "§7A caldeirinha está vazia." : "§7O aspersório já está carregado.",
      initialLevel === 0 ? "§7The aspersorium is empty." : "§7The aspergillum is already loaded.",
    );
    return;
  }

  player.playAnimation("animation.aspergillum.player.load", { blendOutTime: 0.2 });
  player.playSound("armor.equip_chain", { pitch: 1.18, volume: 0.32 });
  action(player, "§7Carregando o aspersório…", "§7Loading the aspergillum…");

  system.runTimeout(() => {
    if (!player.isValid || !block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return;
    const currentItem = getMainhand(player);
    if (!isAspergillum(currentItem)) return;
    const currentLevel = getNumberState(block, WATER_LEVEL_STATE);
    const result = loadFromAspersorium(readAspergillumState(currentItem), currentLevel);
    if (result.waterConsumed === 0) return;

    setMainhand(player, writeAspergillumState(currentItem, result.state, player));
    setState(block, WATER_LEVEL_STATE, currentLevel - result.waterConsumed);
    player.playSound("cauldron.takewater", { pitch: 1.32, volume: 0.78 });
    action(player, `§b${result.state.charges}§7/3 cargas`, `§b${result.state.charges}§7/3 charges`);
  }, 10);
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
