import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemStack,
  Player,
  system,
} from "@minecraft/server";
import { chargeLore, normalizeCharges, type AspergillumState } from "../domain/aspergillum";
import { ASPERGILLUM_ITEM, CHARGES_PROPERTY, INSTANCE_ID_PROPERTY, SCHEMA_PROPERTY } from "./constants";

let instanceSequence = 0;

function createInstanceId(): string {
  instanceSequence = (instanceSequence + 1) % 0x1000000;
  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `ag-${system.currentTick.toString(36)}-${instanceSequence.toString(36)}-${random}`;
}

export function readAspergillumInstanceId(item: ItemStack): string | undefined {
  const value = item.getDynamicProperty(INSTANCE_ID_PROPERTY);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readAspergillumState(item: ItemStack): AspergillumState {
  return {
    charges: normalizeCharges(item.getDynamicProperty(CHARGES_PROPERTY)),
    schemaVersion: 1,
  };
}

export function writeAspergillumState(item: ItemStack, state: AspergillumState, player?: Player): ItemStack {
  const updated = item.clone();
  updated.setDynamicProperty(CHARGES_PROPERTY, normalizeCharges(state.charges));
  updated.setDynamicProperty(SCHEMA_PROPERTY, 1);
  updated.setDynamicProperty(INSTANCE_ID_PROPERTY, readAspergillumInstanceId(item) ?? createInstanceId());
  const locale = player?.clientSystemInfo.locale?.toLowerCase().startsWith("pt") ? "pt_BR" : "en_US";
  updated.setLore(chargeLore(state.charges, locale));
  return updated;
}

export function initializeAspergillum(item: ItemStack, player?: Player): ItemStack {
  return writeAspergillumState(item, readAspergillumState(item), player);
}

export function getMainhand(player: Player): ItemStack | undefined {
  return player.getComponent(EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Mainhand);
}

export function setMainhand(player: Player, item?: ItemStack): void {
  player.getComponent(EntityComponentTypes.Equippable)?.setEquipment(EquipmentSlot.Mainhand, item);
}

export function isAspergillum(item: ItemStack | undefined): item is ItemStack {
  return item?.typeId === ASPERGILLUM_ITEM;
}

export function createAspergillum(charges = 0, player?: Player): ItemStack {
  return writeAspergillumState(
    new ItemStack(ASPERGILLUM_ITEM, 1),
    { charges: normalizeCharges(charges), schemaVersion: 1 },
    player,
  );
}

export function giveOrDrop(player: Player, item: ItemStack): void {
  const mainhand = getMainhand(player);
  if (mainhand === undefined) {
    setMainhand(player, item);
    return;
  }

  const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (inventory === undefined) {
    player.dimension.spawnItem(item, player.location);
    return;
  }
  const remainder = inventory.addItem(item);
  if (remainder !== undefined) player.dimension.spawnItem(remainder, player.location);
}
