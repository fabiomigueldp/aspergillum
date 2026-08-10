import {
  BlockComponentPlayerPlaceBeforeEvent,
  BlockCustomComponent,
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
import {
  handleAspergillumUseOn,
  handleAspersoriumBreak,
  handleAspersoriumInteraction,
} from "../application/aspersorium";
import {
  clearCustomizationPlayerState,
  handleSacristanTableBreak,
  handleSacristanTableInteraction,
  handleSacristanTableUseOn,
} from "../application/sacristan-table";
import { yawToSixteenWayRotation } from "../domain/rotation";
import {
  cancelWaterSpray,
  clearSprinklePlayerState,
  getSprinkleSession,
  trySprinkle,
} from "../application/sprinkle";
import {
  ASPERGILLUM_COMPONENT,
  ASPERSORIUM_BLOCK,
  ASPERSORIUM_COMPONENT,
  SACRISTAN_TABLE_BLOCK,
  SACRISTAN_TABLE_COMPONENT,
  ROTATION_STATE,
  TABLE_ROTATION_STATE,
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
import { ACTION_MESSAGES, action } from "../presentation/messaging";
import {
  reconcileLoadedAspersoriumWaterVisual,
  scheduleAspersoriumWaterVisualReconciliation,
  scheduleAspersoriumWaterVisualRemoval,
} from "../presentation/aspersorium-water-visual";

const aspergillumUse: ItemCustomComponent = {
  onUse(event) {
    if (event.itemStack !== undefined && !isAspergillumSchemaSupported(event.itemStack)) {
      action(event.source, ACTION_MESSAGES.futureSchema);
      return;
    }
    const initialized = event.itemStack ? initializeAspergillum(event.itemStack) : undefined;
    if (initialized !== undefined) setMainhand(event.source, initialized);
    const state = initialized ? readAspergillumState(initialized) : { charges: 0 };
    const policies = resolvePlayerPolicies(event.source);
    if (policies.creative && state.charges > 0) action(event.source, ACTION_MESSAGES.chargesCreative);
    else action(event.source, ACTION_MESSAGES.chargesInspect, state.charges);
  },
  onUseOn(event) {
    if (!(event.source instanceof Player)) return;
    let isSneaking: boolean;
    try {
      isSneaking = event.source.isSneaking;
    } catch {
      return;
    }
    if (event.block.typeId === ASPERSORIUM_BLOCK) {
      handleAspergillumUseOn(event.source, event.block, isSneaking);
    } else if (event.block.typeId === SACRISTAN_TABLE_BLOCK) {
      handleSacristanTableUseOn(event.source, event.block, isSneaking);
    }
  },
};

function cancelTransientPlayerActions(playerId: string): void {
  cancelLoadingSession(playerId);
  cancelWaterSpray(playerId);
  clearCustomizationPlayerState(playerId);
}

function clearTransientPlayerState(playerId: string): void {
  cancelLoadingSession(playerId);
  clearSprinklePlayerState(playerId);
  clearCustomizationPlayerState(playerId);
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

function orientBlock(event: BlockComponentPlayerPlaceBeforeEvent, state: string): void {
  const rotation = yawToSixteenWayRotation(event.player?.getRotation().y ?? 0);
  const withCustomState = event.permutationToPlace.withState as unknown as (
    name: string,
    stateValue: number | boolean | string,
  ) => BlockPermutation;
  event.permutationToPlace = withCustomState.call(event.permutationToPlace, state, rotation);
}

function orientAspersorium(event: BlockComponentPlayerPlaceBeforeEvent): void {
  orientBlock(event, ROTATION_STATE);
}

function orientSacristanTable(event: BlockComponentPlayerPlaceBeforeEvent): void {
  orientBlock(event, TABLE_ROTATION_STATE);
}

system.beforeEvents.startup.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent(ASPERGILLUM_COMPONENT, aspergillumUse);
  const aspersoriumComponent: BlockCustomComponent = {
    beforeOnPlayerPlace: orientAspersorium,
    onBreak(blockEvent) {
      handleAspersoriumBreak(blockEvent);
      scheduleAspersoriumWaterVisualRemoval(blockEvent.dimension, blockEvent.block.location);
    },
    onPlayerInteract: handleAspersoriumInteraction,
  };
  aspersoriumComponent.onPlace = (blockEvent) => {
    scheduleAspersoriumWaterVisualReconciliation(blockEvent.block);
  };
  aspersoriumComponent.onBlockStateChange = (blockEvent) => {
    scheduleAspersoriumWaterVisualReconciliation(blockEvent.block);
  };
  aspersoriumComponent.onTick = (blockEvent) => {
    scheduleAspersoriumWaterVisualReconciliation(blockEvent.block);
  };
  event.blockComponentRegistry.registerCustomComponent(ASPERSORIUM_COMPONENT, aspersoriumComponent);
  event.blockComponentRegistry.registerCustomComponent(SACRISTAN_TABLE_COMPONENT, {
    beforeOnPlayerPlace: orientSacristanTable,
    onBreak: handleSacristanTableBreak,
    onPlayerInteract: handleSacristanTableInteraction,
  });
});

world.afterEvents.entityLoad.subscribe((event) => {
  reconcileLoadedAspersoriumWaterVisual(event.entity);
});

world.afterEvents.playerSwingStart.subscribe((event) => {
  if (event.swingSource !== EntitySwingSource.Attack && event.swingSource !== EntitySwingSource.Mine) return;
  if (!isAspergillum(event.heldItemStack)) return;
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

world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (event.brokenBlockPermutation.type.id !== SACRISTAN_TABLE_BLOCK) return;
  clearCustomizationPlayerState(event.player.id);
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
