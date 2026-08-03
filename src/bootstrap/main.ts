import {
  BlockComponentPlayerPlaceBeforeEvent,
  BlockPermutation,
  EntityComponentTypes,
  EntitySwingSource,
  EquipmentSlot,
  ItemCustomComponent,
  Player,
  system,
  world,
} from "@minecraft/server";
import { handleAspersoriumInteraction } from "../application/aspersorium";
import { yawToSixteenWayRotation } from "../domain/rotation";
import { trySprinkle } from "../application/sprinkle";
import {
  ASPERGILLUM_COMPONENT,
  ASPERGILLUM_ITEM,
  ASPERSORIUM_COMPONENT,
  ROTATION_STATE,
} from "../infrastructure/constants";
import { isAspergillum, readAspergillumState } from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";

const aspergillumUse: ItemCustomComponent = {
  onUse(event) {
    const state = event.itemStack ? readAspergillumState(event.itemStack) : { charges: 0 };
    action(
      event.source,
      `§7Cargas: §b${state.charges}§7/3 • Ataque para aspergir`,
      `§7Charges: §b${state.charges}§7/3 • Attack to sprinkle`,
    );
  },
};

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
