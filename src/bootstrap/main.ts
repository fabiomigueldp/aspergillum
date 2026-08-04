import {
  BlockComponentPlayerPlaceBeforeEvent,
  BlockPermutation,
  EntityComponentTypes,
  EntitySwingSource,
  EquipmentSlot,
  ItemCustomComponent,
  Player,
  PlayerInventoryType,
  system,
  world,
} from "@minecraft/server";
import { handleAspersoriumBreak, handleAspersoriumInteraction } from "../application/aspersorium";
import { yawToSixteenWayRotation } from "../domain/rotation";
import {
  cancelWaterSpray,
  clearSprinklePlayerState,
  getSprinkleSession,
  trySprinkle,
} from "../application/sprinkle";
import {
  ASPERGILLUM_COMPONENT,
  ASPERGILLUM_ITEM,
  ASPERSORIUM_BLOCK,
  ASPERSORIUM_COMPONENT,
  ROTATION_STATE,
} from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  getMainhand,
  initializeAspergillum,
  isAspergillum,
  isAspergillumSchemaSupported,
  needsAspergillumInitialization,
  readAspergillumInstanceId,
  readAspergillumState,
  reissueAspergillumInstanceId,
  setMainhand,
} from "../infrastructure/item-state";
import {
  cancelLoadingAtBlock,
  cancelLoadingSession,
  getLoadingSession,
} from "../infrastructure/loading-session";
import { action } from "../infrastructure/messaging";

const aspergillumUse: ItemCustomComponent = {
  onUse(event) {
    if (event.itemStack !== undefined && !isAspergillumSchemaSupported(event.itemStack)) {
      action(event.source, "§cEste aspersório pertence a uma versão mais recente.", "§cThis aspergillum belongs to a newer version.");
      return;
    }
    const initialized = event.itemStack ? initializeAspergillum(event.itemStack) : undefined;
    if (initialized !== undefined) setMainhand(event.source, initialized);
    const state = initialized ? readAspergillumState(initialized) : { charges: 0 };
    const policies = resolvePlayerPolicies(event.source);
    action(
      event.source,
      policies.creative && state.charges > 0
        ? "§7Água benta: §b∞ §7• Criativo"
        : `§7Cargas: §b${state.charges}§7/3 • Ataque para aspergir`,
      policies.creative && state.charges > 0
        ? "§7Holy water: §b∞ §7• Creative"
        : `§7Charges: §b${state.charges}§7/3 • Attack to sprinkle`,
    );
  },
};

function cancelTransientPlayerActions(playerId: string): void {
  cancelLoadingSession(playerId);
  cancelWaterSpray(playerId);
}

function clearTransientPlayerState(playerId: string): void {
  cancelLoadingSession(playerId);
  clearSprinklePlayerState(playerId);
}

function initializeInventorySlot(player: Player, slot: number): void {
  system.run(() => {
    if (!player.isValid) return;
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (inventory === undefined || slot < 0 || slot >= inventory.size) return;
    const item = inventory.getItem(slot);
    if (!isAspergillum(item)) return;
    let updated = needsAspergillumInitialization(item) ? initializeAspergillum(item) : item;
    const instanceId = readAspergillumInstanceId(updated);
    if (instanceId !== undefined) {
      for (let otherSlot = 0; otherSlot < inventory.size; otherSlot += 1) {
        if (otherSlot === slot) continue;
        const other = inventory.getItem(otherSlot);
        if (isAspergillum(other) && readAspergillumInstanceId(other) === instanceId) {
          updated = reissueAspergillumInstanceId(updated);
          break;
        }
      }
    }
    if (updated !== item) inventory.setItem(slot, updated);
  });
}

function initializeSelectedAspergillum(player: Player): void {
  initializeInventorySlot(player, player.selectedSlotIndex);
}

function initializePlayerInventory(player: Player): void {
  system.run(() => {
    if (!player.isValid) return;
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (inventory === undefined) return;
    const seenInstanceIds = new Set<string>();
    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);
      if (!isAspergillum(item)) continue;
      let updated = needsAspergillumInitialization(item) ? initializeAspergillum(item) : item;
      const instanceId = readAspergillumInstanceId(updated);
      if (instanceId !== undefined && seenInstanceIds.has(instanceId)) {
        updated = reissueAspergillumInstanceId(updated);
      }
      const finalId = readAspergillumInstanceId(updated);
      if (finalId !== undefined) seenInstanceIds.add(finalId);
      if (updated !== item) inventory.setItem(slot, updated);
    }
  });
}

function orientAspersorium(event: BlockComponentPlayerPlaceBeforeEvent): void {
  const rotation = yawToSixteenWayRotation(event.player?.getRotation().y ?? 0);
  const withCustomState = event.permutationToPlace.withState as unknown as (
    name: string,
    stateValue: number | boolean | string,
  ) => BlockPermutation;
  event.permutationToPlace = withCustomState.call(event.permutationToPlace, ROTATION_STATE, rotation);
}

system.beforeEvents.startup.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent(ASPERGILLUM_COMPONENT, aspergillumUse);
  event.blockComponentRegistry.registerCustomComponent(ASPERSORIUM_COMPONENT, {
    beforeOnPlayerPlace: orientAspersorium,
    onBreak: handleAspersoriumBreak,
    onPlayerInteract: handleAspersoriumInteraction,
  });
});

world.afterEvents.playerSwingStart.subscribe((event) => {
  if (event.swingSource !== EntitySwingSource.Attack && event.swingSource !== EntitySwingSource.Mine) return;
  if (event.heldItemStack?.typeId !== ASPERGILLUM_ITEM) return;
  trySprinkle(event.player);
});

world.beforeEvents.entityHurt.subscribe((event) => {
  const attacker = event.damageSource.damagingEntity;
  if (!(attacker instanceof Player)) return;
  const item = attacker
    .getComponent(EntityComponentTypes.Equippable)
    ?.getEquipment(EquipmentSlot.Mainhand);
  if (isAspergillum(item)) event.cancel = true;
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  if (isAspergillum(event.itemStack)) event.cancel = true;
});

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((event) => {
  cancelTransientPlayerActions(event.player.id);
  initializeSelectedAspergillum(event.player);
});

world.afterEvents.playerDimensionChange.subscribe((event) => {
  clearTransientPlayerState(event.player.id);
});

world.afterEvents.playerGameModeChange.subscribe((event) => {
  cancelTransientPlayerActions(event.player.id);
});

world.afterEvents.playerInventoryItemChange.subscribe((event) => {
  if (isAspergillum(event.itemStack)) initializeInventorySlot(event.player, event.slot);
  if (event.inventoryType !== PlayerInventoryType.Hotbar) return;
  const loadingSession = getLoadingSession(event.player.id);
  if (
    loadingSession !== undefined
    && loadingSession.slot === event.slot
    && (!isAspergillum(event.itemStack)
      || readAspergillumInstanceId(event.itemStack) !== loadingSession.itemInstanceId)
  ) {
    cancelLoadingSession(event.player.id);
  }
  const sprinkleSession = getSprinkleSession(event.player.id);
  if (
    sprinkleSession !== undefined
    && sprinkleSession.slot === event.slot
    && (!isAspergillum(event.itemStack)
      || readAspergillumInstanceId(event.itemStack) !== sprinkleSession.itemInstanceId)
  ) {
    cancelWaterSpray(event.player.id);
  }
});

world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (event.brokenBlockPermutation.type.id !== ASPERSORIUM_BLOCK) return;
  cancelLoadingAtBlock(event.block.dimension.id, event.block.location);
});

world.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity instanceof Player) clearTransientPlayerState(event.deadEntity.id);
});

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) clearTransientPlayerState(event.player.id);
  initializePlayerInventory(event.player);
});

world.afterEvents.playerLeave.subscribe((event) => {
  clearTransientPlayerState(event.playerId);
});
