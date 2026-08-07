import {
  Block,
  BlockComponentBlockBreakEvent,
  BlockComponentPlayerInteractEvent,
  MolangVariableMap,
  Player,
  system,
} from "@minecraft/server";
import {
  resolveCosmetic,
  resolveCosmeticSelection,
} from "../domain/customization";
import { deterministicDropletDirections } from "../domain/cone";
import { resolveSprayProfile } from "../domain/spray-profile";
import { getActionLease } from "../infrastructure/action-lease";
import { readBooleanBlockState, withCustomBlockState } from "../infrastructure/block-state";
import {
  DROPLET_PARTICLE,
  SACRISTAN_TABLE_BLOCK,
  TABLE_COSMETIC_STATE,
  TABLE_OCCUPIED_STATE,
  TABLE_ROTATION_STATE,
} from "../infrastructure/constants";
import {
  acquireCustomizationSession,
  isCurrentCustomizationSession,
  releaseCustomizationAtBlock,
  releaseCustomizationSession,
  type CustomizationSession,
} from "../infrastructure/customization-session";
import {
  deleteDockedSnapshot,
  getDockedSnapshot,
  setDockedSnapshot,
} from "../infrastructure/docked-item-registry";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  captureDockedAspergillum,
  createAspergillum,
  getMainhand,
  giveOrDrop,
  initializeAspergillum,
  isAspergillum,
  isAspergillumSchemaSupported,
  readAspergillumState,
  restoreDockedAspergillum,
  setMainhand,
} from "../infrastructure/item-state";
import { showCustomizationMenu } from "../presentation/customization-menu";
import { ACTION_MESSAGES, action } from "../presentation/messaging";

const INTERACTION_DEDUPE_TICKS = 2;
const PREVIEW_COOLDOWN_TICKS = 20;
const interactionClaims = new Map<string, number>();
const lastPreviewTicks = new Map<string, number>();

function tableKey(block: Block): string {
  const { x, y, z } = block.location;
  return `${block.dimension.id}|${x},${y},${z}`;
}

function claimInteraction(player: Player, block: Block): boolean {
  const key = `${player.id}|${tableKey(block)}`;
  const tick = system.currentTick;
  const previous = interactionClaims.get(key);
  if (previous !== undefined && tick - previous <= INTERACTION_DEDUPE_TICKS) return false;
  interactionClaims.set(key, tick);
  system.runTimeout(() => {
    if (interactionClaims.get(key) === tick) interactionClaims.delete(key);
  }, INTERACTION_DEDUPE_TICKS + 1);
  return true;
}

function isOccupied(block: Block): boolean {
  return readBooleanBlockState(block.permutation.getAllStates(), TABLE_OCCUPIED_STATE);
}

function isWithinRange(player: Player, block: Block): boolean {
  const dx = player.location.x - (block.location.x + 0.5);
  const dy = player.location.y - (block.location.y + 0.5);
  const dz = player.location.z - (block.location.z + 0.5);
  return dx * dx + dy * dy + dz * dz <= 36;
}

function tablePermutation(block: Block, occupied: boolean, cosmeticId: unknown) {
  const cosmetic = resolveCosmetic(cosmeticId);
  return withCustomBlockState(
    withCustomBlockState(block.permutation, TABLE_OCCUPIED_STATE, occupied),
    TABLE_COSMETIC_STATE,
    occupied ? cosmetic.index : 0,
  );
}

function dockOnTable(player: Player, block: Block): boolean {
  const originalItem = getMainhand(player);
  if (!isAspergillum(originalItem) || isOccupied(block)) return false;
  if (!isAspergillumSchemaSupported(originalItem)) {
    action(player, ACTION_MESSAGES.futureSchema);
    return false;
  }
  const item = initializeAspergillum(originalItem);
  const state = readAspergillumState(item);
  const dimensionId = block.dimension.id;
  let previousSnapshot;
  try {
    previousSnapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Sacristan table registry could not be read: ${String(error)}`);
    action(player, ACTION_MESSAGES.registryRepairRequired);
    return false;
  }
  if (previousSnapshot !== undefined) {
    action(player, ACTION_MESSAGES.registryRecoveryRequired);
    return false;
  }
  const snapshot = captureDockedAspergillum(item, state.charges);
  const originalPermutation = block.permutation;
  const updatedPermutation = tablePermutation(block, true, state.cosmeticId);
  try {
    setDockedSnapshot(dimensionId, block.location, snapshot);
    setMainhand(player, undefined);
    block.setPermutation(updatedPermutation);
  } catch (error) {
    try { setMainhand(player, originalItem); } catch { /* defensive rollback */ }
    try { block.setPermutation(originalPermutation); } catch { /* defensive rollback */ }
    try { deleteDockedSnapshot(dimensionId, block.location); } catch { /* defensive rollback */ }
    console.error(`[Aspergillum] Sacristan table docking failed: ${String(error)}`);
    action(player, ACTION_MESSAGES.dockingCancelled);
    return false;
  }
  action(player, ACTION_MESSAGES.tableDocked);
  return true;
}

function undockFromTable(player: Player, block: Block): boolean {
  if (!isOccupied(block)) return false;
  const dimensionId = block.dimension.id;
  let snapshot;
  try {
    snapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Sacristan table registry could not be read: ${String(error)}`);
    action(player, ACTION_MESSAGES.registryRepairRequired);
    return false;
  }
  const restoredItem = snapshot === undefined ? createAspergillum(0) : restoreDockedAspergillum(snapshot);
  const originalPermutation = block.permutation;
  const updatedPermutation = tablePermutation(block, false, "classic");
  try {
    block.setPermutation(updatedPermutation);
    if (snapshot !== undefined) deleteDockedSnapshot(dimensionId, block.location);
    giveOrDrop(player, restoredItem);
  } catch (error) {
    try { block.setPermutation(originalPermutation); } catch { /* defensive rollback */ }
    if (snapshot !== undefined) {
      try { setDockedSnapshot(dimensionId, block.location, snapshot); } catch { /* defensive rollback */ }
    }
    console.error(`[Aspergillum] Sacristan table retrieval failed: ${String(error)}`);
    action(player, ACTION_MESSAGES.undockingCancelled);
    return false;
  }
  action(player, ACTION_MESSAGES.tableUndocked);
  return true;
}

function updateStoredCustomization(
  player: Player,
  block: Block,
  session: CustomizationSession,
  cosmeticId?: string,
  sprayProfileId?: string,
): boolean {
  if (!isCurrentCustomizationSession(session)
    || !player.isValid
    || player.dimension.id !== block.dimension.id
    || !block.isValid
    || block.typeId !== SACRISTAN_TABLE_BLOCK
    || !isWithinRange(player, block)
    || !isOccupied(block)) return false;

  const dimensionId = block.dimension.id;
  let snapshot;
  try {
    snapshot = getDockedSnapshot(dimensionId, block.location);
  } catch {
    return false;
  }
  if (snapshot === undefined) return false;
  const nextCosmeticId = cosmeticId === undefined ? snapshot.cosmeticId : resolveCosmetic(cosmeticId).id;
  const nextProfileId = sprayProfileId === undefined
    ? snapshot.sprayProfileId
    : resolveSprayProfile(sprayProfileId).id;
  const updatedSnapshot = {
    ...snapshot,
    cosmeticId: nextCosmeticId,
    sprayProfileId: nextProfileId,
  };
  const originalPermutation = block.permutation;
  const updatedPermutation = tablePermutation(block, true, nextCosmeticId);
  try {
    setDockedSnapshot(dimensionId, block.location, updatedSnapshot);
    block.setPermutation(updatedPermutation);
    return true;
  } catch (error) {
    try { setDockedSnapshot(dimensionId, block.location, snapshot); } catch { /* defensive rollback */ }
    try { block.setPermutation(originalPermutation); } catch { /* defensive rollback */ }
    console.error(`[Aspergillum] Customization update failed: ${String(error)}`);
    return false;
  }
}

function previewProfile(player: Player, block: Block, profileId: string): void {
  const key = tableKey(block);
  const now = system.currentTick;
  const previous = lastPreviewTicks.get(key);
  if (previous !== undefined && now - previous < PREVIEW_COOLDOWN_TICKS) return;
  lastPreviewTicks.set(key, now);
  const rotationValue = block.permutation.getAllStates()[TABLE_ROTATION_STATE];
  const rotation = typeof rotationValue === "number" ? rotationValue : 0;
  const radians = rotation * 22.5 * Math.PI / 180;
  const direction = { x: Math.sin(radians), y: 0.08, z: Math.cos(radians) };
  const profile = resolveSprayProfile(profileId);
  const directions = deterministicDropletDirections(direction, 6, undefined, profile);
  const previewSpeed = 2.1 * (profile.minimumSpeed / 12.7);
  const origin = {
    x: block.location.x + 0.5,
    y: block.location.y + 1.08,
    z: block.location.z + 0.5,
  };
  for (const [index, dropletDirection] of directions.entries()) {
    const variables = new MolangVariableMap();
    variables.setSpeedAndDirection("variable.aspergillum_motion", previewSpeed + index * 0.08, dropletDirection);
    variables.setFloat("variable.aspergillum_scale", 0.54 + (index % 3) * 0.04);
    try {
      block.dimension.spawnParticle(DROPLET_PARTICLE, origin, variables);
    } catch (error) {
      console.warn(`[Aspergillum] Unable to preview spray profile: ${String(error)}`);
      return;
    }
  }
}

function openTableMenu(player: Player, block: Block): void {
  const dimensionId = block.dimension.id;
  let snapshot;
  try {
    snapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Sacristan table registry could not be read: ${String(error)}`);
    action(player, ACTION_MESSAGES.registryRepairRequired);
    return;
  }
  if (snapshot === undefined) {
    action(player, ACTION_MESSAGES.registryRecoveryRequired);
    return;
  }
  const acquired = acquireCustomizationSession(player.id, dimensionId, block.location, system.currentTick);
  if (acquired.status !== "acquired") {
    action(player, ACTION_MESSAGES.tableBusy);
    return;
  }
  const session = acquired.session;
  let currentCosmeticId = snapshot.cosmeticId;
  let currentProfileId = snapshot.sprayProfileId;
  try {
    showCustomizationMenu(player, {
      charges: snapshot.charges,
      cosmeticId: currentCosmeticId,
      sprayProfileId: currentProfileId,
    }, {
      applyCosmetic(cosmeticId) {
        const applied = updateStoredCustomization(player, block, session, cosmeticId, undefined);
        if (applied) currentCosmeticId = resolveCosmetic(cosmeticId).id;
        return applied;
      },
      applySprayProfile(profileId) {
        const applied = updateStoredCustomization(player, block, session, undefined, profileId);
        if (applied) currentProfileId = resolveSprayProfile(profileId).id;
        return applied;
      },
      preview() {
        if (isCurrentCustomizationSession(session)) previewProfile(player, block, currentProfileId);
      },
      restoreClassic() {
        const classic = resolveCosmeticSelection("silver", "chestnut");
        const applied = updateStoredCustomization(player, block, session, classic.id, "standard");
        if (applied) {
          currentCosmeticId = classic.id;
          currentProfileId = "standard";
        }
        return applied;
      },
      finishAndRetrieve() {
        if (!isCurrentCustomizationSession(session)) return false;
        releaseCustomizationSession(player.id);
        return undockFromTable(player, block);
      },
      close() {
        releaseCustomizationSession(player.id);
      },
    });
  } catch (error) {
    releaseCustomizationSession(player.id);
    console.error(`[Aspergillum] Could not construct customization menu: ${String(error)}`);
  }
}

function scheduleInteraction(player: Player, block: Block, isSneaking: boolean): void {
  if (!claimInteraction(player, block)) return;
  system.run(() => {
    if (!player.isValid || !block.isValid || block.typeId !== SACRISTAN_TABLE_BLOCK) return;
    if (resolvePlayerPolicies(player).denied) return;
    if (getActionLease(player.id) !== undefined) {
      action(player, ACTION_MESSAGES.actionBusy);
      return;
    }
    const item = getMainhand(player);
    if (!isOccupied(block)) {
      if (!isAspergillum(item)) {
        action(player, ACTION_MESSAGES.tableHint);
        return;
      }
      if (dockOnTable(player, block)) openTableMenu(player, block);
      return;
    }
    if (isSneaking && item === undefined) {
      releaseCustomizationAtBlock(block.dimension.id, block.location);
      undockFromTable(player, block);
      return;
    }
    openTableMenu(player, block);
  });
}

export function handleSacristanTableUseOn(player: Player, block: Block, isSneaking: boolean): void {
  if (block.typeId === SACRISTAN_TABLE_BLOCK) scheduleInteraction(player, block, isSneaking);
}

export function handleSacristanTableInteraction(event: BlockComponentPlayerInteractEvent): void {
  const player = event.player;
  if (player === undefined || event.block.typeId !== SACRISTAN_TABLE_BLOCK) return;
  let isSneaking: boolean;
  try { isSneaking = player.isSneaking; } catch { return; }
  scheduleInteraction(player, event.block, isSneaking);
}

export function handleSacristanTableBreak(event: BlockComponentBlockBreakEvent): void {
  if (event.brokenBlockPermutation.type.id !== SACRISTAN_TABLE_BLOCK) return;
  const location = { ...event.block.location };
  const dimension = event.dimension;
  const dimensionId = dimension.id;
  releaseCustomizationAtBlock(dimensionId, location);
  lastPreviewTicks.delete(`${dimensionId}|${location.x},${location.y},${location.z}`);
  if (event.brokenBlockPermutation.getAllStates()[TABLE_OCCUPIED_STATE] !== true) return;
  system.run(() => {
    try {
      const snapshot = getDockedSnapshot(dimensionId, location);
      const recovered = snapshot === undefined ? createAspergillum(0) : restoreDockedAspergillum(snapshot);
      dimension.spawnItem(recovered, {
        x: location.x + 0.5,
        y: location.y + 0.8,
        z: location.z + 0.5,
      });
      if (snapshot !== undefined) deleteDockedSnapshot(dimensionId, location);
    } catch (error) {
      console.error(`[Aspergillum] Could not recover customized item after table destruction: ${String(error)}`);
    }
  });
}

export function clearCustomizationPlayerState(playerId: string): void {
  releaseCustomizationSession(playerId);
}
