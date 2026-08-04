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
import { handleAspersoriumInteraction } from "../application/aspersorium";
import { yawToSixteenWayRotation } from "../domain/rotation";
import { cancelWaterSpray, clearSprinklePlayerState, trySprinkle } from "../application/sprinkle";
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
  readAspergillumInstanceId,
  readAspergillumState,
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
    const initialized = event.itemStack ? initializeAspergillum(event.itemStack, event.source) : undefined;
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

function initializeSelectedAspergillum(player: Player): void {
  system.run(() => {
    if (!player.isValid) return;
    const item = getMainhand(player);
    if (!isAspergillum(item) || readAspergillumInstanceId(item) !== undefined) return;
    setMainhand(player, initializeAspergillum(item, player));
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
  if (event.inventoryType !== PlayerInventoryType.Hotbar) return;
  const session = getLoadingSession(event.player.id);
  if (session === undefined || session.slot !== event.slot) return;
  if (!isAspergillum(event.itemStack) || readAspergillumInstanceId(event.itemStack) !== session.itemInstanceId) {
    cancelLoadingSession(event.player.id);
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
  initializeSelectedAspergillum(event.player);
});

world.afterEvents.playerLeave.subscribe((event) => {
  clearTransientPlayerState(event.playerId);
});
