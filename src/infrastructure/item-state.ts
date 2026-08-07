import {
  EntityComponentTypes,
  EquipmentSlot,
  ItemStack,
  type Player,
  type RawMessage,
  type Vector3,
  system,
} from "@minecraft/server";
import {
  ASPERGILLUM_CAPACITY,
  CURRENT_SCHEMA_VERSION,
  createDefaultAspergillumState,
  migrateAspergillumState,
  normalizeCharges,
  type AspergillumMigration,
  type AspergillumState,
} from "../domain/aspergillum";
import { resolveCosmetic } from "../domain/customization";
import { resolveSprayProfile } from "../domain/spray-profile";
import {
  type DockedAspergillumSnapshot,
  type SerializedDynamicProperty,
} from "../domain/docking";
import {
  ASPERGILLUM_ITEM,
  CHARGES_PROPERTY,
  COSMETIC_ID_PROPERTY,
  INSTANCE_ID_PROPERTY,
  SCHEMA_PROPERTY,
  SPRAY_PROFILE_ID_PROPERTY,
} from "./constants";
import {
  aspergillumItemTypeForCosmetic,
  cosmeticIdForAspergillumItemType,
  isAspergillumItemType,
} from "./item-variants";

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

export function getAspergillumMigration(item: ItemStack): AspergillumMigration {
  return migrateAspergillumState({
    charges: item.getDynamicProperty(CHARGES_PROPERTY),
    schemaVersion: item.getDynamicProperty(SCHEMA_PROPERTY),
    cosmeticId: item.getDynamicProperty(COSMETIC_ID_PROPERTY)
      ?? cosmeticIdForAspergillumItemType(item.typeId),
    sprayProfileId: item.getDynamicProperty(SPRAY_PROFILE_ID_PROPERTY),
  });
}

export function readAspergillumState(item: ItemStack): AspergillumState {
  return getAspergillumMigration(item).state;
}

export function isAspergillumSchemaSupported(item: ItemStack): boolean {
  return getAspergillumMigration(item).status !== "future";
}

function loreFor(state: AspergillumState): RawMessage[] {
  const cosmetic = resolveCosmetic(state.cosmeticId);
  const profile = resolveSprayProfile(state.sprayProfileId);
  return [
    {
      translate: "item.aspergillum.lore.charges",
      with: [String(normalizeCharges(state.charges)), String(ASPERGILLUM_CAPACITY)],
    },
    {
      rawtext: [
        { translate: "item.aspergillum.lore.profile" },
        { translate: `ui.aspergillum.profile.${profile.id}.name` },
      ],
    },
    {
      rawtext: [
        { translate: "item.aspergillum.lore.appearance" },
        { translate: `ui.aspergillum.metal.${cosmetic.metal}.name` },
        { translate: "item.aspergillum.lore.grip" },
        { translate: `ui.aspergillum.grip.${cosmetic.grip}.name` },
      ],
    },
    { translate: "item.aspergillum.lore.instructions" },
    { translate: "item.aspergillum.lore.docking" },
    { translate: "item.aspergillum.lore.creative" },
  ];
}

export function writeAspergillumState(item: ItemStack, state: AspergillumState): ItemStack {
  if (state.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported future aspergillum schema ${state.schemaVersion}`);
  }
  const targetTypeId = aspergillumItemTypeForCosmetic(state.cosmeticId);
  const retargeted = item.typeId !== targetTypeId;
  const updated = retargeted ? new ItemStack(targetTypeId, 1) : item.clone();
  if (retargeted) {
    for (const propertyId of item.getDynamicPropertyIds()) {
      const value = item.getDynamicProperty(propertyId);
      if (value !== undefined) updated.setDynamicProperty(propertyId, value);
    }
    if (item.nameTag !== undefined) updated.nameTag = item.nameTag;
  }
  updated.setDynamicProperty(CHARGES_PROPERTY, normalizeCharges(state.charges));
  updated.setDynamicProperty(SCHEMA_PROPERTY, CURRENT_SCHEMA_VERSION);
  updated.setDynamicProperty(INSTANCE_ID_PROPERTY, readAspergillumInstanceId(item) ?? createInstanceId());
  updated.setDynamicProperty(COSMETIC_ID_PROPERTY, state.cosmeticId);
  updated.setDynamicProperty(SPRAY_PROFILE_ID_PROPERTY, state.sprayProfileId);
  updated.setLore(loreFor(state));
  return updated;
}

export function needsAspergillumInitialization(item: ItemStack): boolean {
  const migration = getAspergillumMigration(item);
  if (migration.status === "future") return false;
  const storedCharges = item.getDynamicProperty(CHARGES_PROPERTY);
  return migration.status !== "current"
    || readAspergillumInstanceId(item) === undefined
    || storedCharges !== migration.state.charges
    || item.getDynamicProperty(COSMETIC_ID_PROPERTY) !== migration.state.cosmeticId
    || item.getDynamicProperty(SPRAY_PROFILE_ID_PROPERTY) !== migration.state.sprayProfileId
    || item.getRawLore().length !== 6;
}

export function initializeAspergillum(item: ItemStack): ItemStack {
  const migration = getAspergillumMigration(item);
  return migration.status === "future" ? item.clone() : writeAspergillumState(item, migration.state);
}

export function ensureInitializedAspergillumInMainhand(player: Player, item: ItemStack): ItemStack {
  if (!needsAspergillumInitialization(item)) return item;
  const initialized = initializeAspergillum(item);
  setMainhand(player, initialized);
  return initialized;
}

export function reissueAspergillumInstanceId(item: ItemStack): ItemStack {
  const updated = initializeAspergillum(item);
  if (!isAspergillumSchemaSupported(updated)) return updated;
  updated.setDynamicProperty(INSTANCE_ID_PROPERTY, createInstanceId());
  return updated;
}

export function getMainhand(player: Player): ItemStack | undefined {
  return player.getComponent(EntityComponentTypes.Equippable)?.getEquipment(EquipmentSlot.Mainhand);
}

export function setMainhand(player: Player, item?: ItemStack): void {
  player.getComponent(EntityComponentTypes.Equippable)?.setEquipment(EquipmentSlot.Mainhand, item);
}

export function isAspergillum(item: ItemStack | undefined): item is ItemStack {
  return item !== undefined && isAspergillumItemType(item.typeId);
}

export function createAspergillum(charges = 0): ItemStack {
  return writeAspergillumState(
    new ItemStack(ASPERGILLUM_ITEM, 1),
    createDefaultAspergillumState(charges),
  );
}

const corePropertyIds = new Set([
  CHARGES_PROPERTY,
  SCHEMA_PROPERTY,
  INSTANCE_ID_PROPERTY,
  COSMETIC_ID_PROPERTY,
  SPRAY_PROFILE_ID_PROPERTY,
]);

function serializeDynamicProperty(value: boolean | number | string | Vector3): SerializedDynamicProperty | undefined {
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)) {
    return { kind: "vector3", x: value.x, y: value.y, z: value.z };
  }
  return undefined;
}

export function captureDockedAspergillum(item: ItemStack, remainingCharges: unknown): DockedAspergillumSnapshot {
  const initialized = initializeAspergillum(item);
  const migration = getAspergillumMigration(initialized);
  const instanceId = readAspergillumInstanceId(initialized);
  if (migration.status === "future") throw new Error("Cannot dock an item from a future schema");
  if (instanceId === undefined) throw new Error("Aspergillum instance identity is missing");
  const customProperties: Record<string, SerializedDynamicProperty> = {};
  for (const propertyId of initialized.getDynamicPropertyIds()) {
    if (corePropertyIds.has(propertyId)) continue;
    const value = initialized.getDynamicProperty(propertyId);
    if (value === undefined) continue;
    const serialized = serializeDynamicProperty(value);
    if (serialized !== undefined) customProperties[propertyId] = serialized;
  }
  return {
    schemaVersion: 2,
    instanceId,
    ...(initialized.nameTag !== undefined ? { nameTag: initialized.nameTag } : {}),
    charges: normalizeCharges(remainingCharges),
    cosmeticId: migration.state.cosmeticId,
    sprayProfileId: migration.state.sprayProfileId,
    customProperties,
  };
}

export function restoreDockedAspergillum(snapshot: DockedAspergillumSnapshot): ItemStack {
  const item = new ItemStack(aspergillumItemTypeForCosmetic(snapshot.cosmeticId), 1);
  item.setDynamicProperty(INSTANCE_ID_PROPERTY, snapshot.instanceId);
  for (const [propertyId, value] of Object.entries(snapshot.customProperties)) {
    if (typeof value === "object") {
      item.setDynamicProperty(propertyId, { x: value.x, y: value.y, z: value.z });
    } else {
      item.setDynamicProperty(propertyId, value);
    }
  }
  if (snapshot.nameTag !== undefined) item.nameTag = snapshot.nameTag;
  return writeAspergillumState(item, {
    ...createDefaultAspergillumState(snapshot.charges),
    cosmeticId: snapshot.cosmeticId,
    sprayProfileId: snapshot.sprayProfileId,
  });
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
