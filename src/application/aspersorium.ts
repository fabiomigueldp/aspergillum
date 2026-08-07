import {
  Block,
  BlockComponentBlockBreakEvent,
  BlockComponentPlayerInteractEvent,
  ItemStack,
  Player,
  system,
} from "@minecraft/server";
import { loadFromAspersorium } from "../domain/aspergillum";
import { ASPERSORIUM_CAPACITY, WATER_BUCKET_FILL } from "../domain/aspersorium-water";
import { resolveDocking } from "../domain/docking";
import { getActionLease } from "../infrastructure/action-lease";
import { ASPERSORIUM_BLOCK, DOCKED_STATE } from "../infrastructure/constants";
import { readBooleanBlockState, withCustomBlockState } from "../infrastructure/block-state";
import { readAspersoriumWater, withAspersoriumWater } from "../infrastructure/aspersorium-water-state";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  captureDockedAspergillum,
  createAspergillum,
  getMainhand,
  giveOrDrop,
  ensureInitializedAspergillumInMainhand,
  initializeAspergillum,
  isAspergillum,
  isAspergillumSchemaSupported,
  readAspergillumInstanceId,
  readAspergillumState,
  restoreDockedAspergillum,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
import {
  cancelLoadingAtBlock,
  getLoadingBlockOwner,
  startLoadingSession,
  type LoadingSession,
} from "../infrastructure/loading-session";
import {
  deleteDockedSnapshot,
  getDockedSnapshot,
  setDockedSnapshot,
} from "../infrastructure/docked-item-registry";
import { commitMainhandAndBlock } from "../infrastructure/minecraft-transaction";
import { playLoadingAnimation } from "../presentation/animation-coordinator";
import { aspersoriumAcousticCenter } from "../presentation/audio/audio-location";
import { audioPort } from "../presentation/audio/bedrock-audio-adapter";
import type { TransferAmount } from "../presentation/audio/audio-port";
import { ACTION_MESSAGES, action } from "../presentation/messaging";
import { presentLoadedAspergillum } from "../presentation/wet-feedback";

type AspersoriumInteractionIntent = "load" | "dock";

const INTERACTION_DEDUPE_TICKS = 2;
const interactionClaims = new Map<string, number>();

function interactionClaimKey(player: Player, block: Block): string {
  const { x, y, z } = block.location;
  return `${player.id}|${block.dimension.id}|${x},${y},${z}`;
}

function claimAspersoriumInteraction(player: Player, block: Block): boolean {
  const key = interactionClaimKey(player, block);
  const tick = system.currentTick;
  const previousTick = interactionClaims.get(key);
  if (previousTick !== undefined && tick - previousTick <= INTERACTION_DEDUPE_TICKS) return false;

  interactionClaims.set(key, tick);
  system.runTimeout(() => {
    if (interactionClaims.get(key) === tick) interactionClaims.delete(key);
  }, INTERACTION_DEDUPE_TICKS + 1);
  return true;
}

function getBooleanState(block: Block, state: string): boolean {
  return readBooleanBlockState(block.permutation.getAllStates(), state);
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
  if (readAspersoriumWater(block) >= ASPERSORIUM_CAPACITY) {
    action(player, ACTION_MESSAGES.aspersoriumAlreadyFull);
    return;
  }

  const originalItem = getMainhand(player);
  if (originalItem?.typeId !== "minecraft:water_bucket") return;
  const originalPermutation = block.permutation;
  const updatedPermutation = withAspersoriumWater(originalPermutation, WATER_BUCKET_FILL);
  if (policies.creative) {
    try {
      block.setPermutation(updatedPermutation);
    } catch (error) {
      console.error(`[Aspergillum] Aspersorium fill transaction failed: ${String(error)}`);
      return;
    }
  } else if (!commitMainhandAndBlock(
    player,
    originalItem,
    new ItemStack("minecraft:bucket", 1),
    block,
    originalPermutation,
    updatedPermutation,
    "aspersorium fill",
  )) return;
  audioPort.emit(player, {
    kind: "aspersorium.fill",
    location: aspersoriumAcousticCenter(block.location),
    actionId: `${player.id}:${system.currentTick}:fill`,
  });
  action(player, ACTION_MESSAGES.aspersoriumFilled);
}

function commitLoading(player: Player, session: LoadingSession): boolean {
  if (!player.isValid || player.id !== session.playerId) return false;
  if (player.dimension.id !== session.dimensionId || player.selectedSlotIndex !== session.slot) return false;
  const block = player.dimension.getBlock(session.blockLocation);
  if (block === undefined || !block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return false;
  if (!isWithinLoadingRange(player, block) || getBooleanState(block, DOCKED_STATE)) return false;

  const currentItem = getMainhand(player);
  if (!isAspergillum(currentItem)) return false;
  if (readAspergillumInstanceId(currentItem) !== session.itemInstanceId) return false;
  const currentLevel = readAspersoriumWater(block);
  if (currentLevel <= 0 || currentLevel !== session.expectedWaterLevel) return false;

  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return false;
  const result = loadFromAspersorium(readAspergillumState(currentItem), currentLevel, policies.waterPolicy);
  if (result.transferred === 0) return false;

  const originalPermutation = block.permutation;
  const updatedPermutation = withAspersoriumWater(originalPermutation, result.nextWater);
  const updatedItem = writeAspergillumState(currentItem, result.state);
  if (!commitMainhandAndBlock(
    player,
    currentItem,
    updatedItem,
    block,
    originalPermutation,
    updatedPermutation,
    "aspergillum load",
  )) {
    action(player, ACTION_MESSAGES.loadingCancelled);
    return false;
  }
  audioPort.emit(player, {
    kind: "load.commit",
    amount: result.transferred as TransferAmount,
    location: aspersoriumAcousticCenter(block.location),
    actionId: session.leaseToken,
  });
  presentLoadedAspergillum(player, block.location);
  if (policies.creative) action(player, ACTION_MESSAGES.chargesCreative);
  else action(player, ACTION_MESSAGES.chargesLoaded, result.state.charges);
  return true;
}

function loadItem(player: Player, block: Block): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  if (!isAspergillumSchemaSupported(rawItem)) {
    action(player, ACTION_MESSAGES.futureSchema);
    return;
  }
  const initialItem = ensureInitializedAspergillumInMainhand(player, rawItem);
  const instanceId = readAspergillumInstanceId(initialItem);
  if (instanceId === undefined) return;
  const initialLevel = readAspersoriumWater(block);
  const preview = loadFromAspersorium(readAspergillumState(initialItem), initialLevel, policies.waterPolicy);
  if (preview.transferred === 0) {
    action(player, initialLevel === 0 ? ACTION_MESSAGES.aspersoriumEmpty : ACTION_MESSAGES.alreadyLoaded);
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
    16,
  );
  if (started.status === "player_busy") {
    action(player, ACTION_MESSAGES.alreadyLoading);
    return;
  }
  if (started.status === "block_busy") {
    action(player, ACTION_MESSAGES.aspersoriumBusy);
    return;
  }

  audioPort.emit(player, {
    kind: "load.prepare",
    location: aspersoriumAcousticCenter(block.location),
    actionId: started.session.leaseToken,
  });
  playLoadingAnimation(player);
  action(player, ACTION_MESSAGES.loading);
}

function dockItem(player: Player, block: Block): void {
  if (resolvePlayerPolicies(player).denied) return;
  const originalItem = getMainhand(player);
  if (!isAspergillum(originalItem) || getBooleanState(block, DOCKED_STATE)) return;
  if (!isAspergillumSchemaSupported(originalItem)) {
    action(player, ACTION_MESSAGES.futureSchema);
    return;
  }
  const item = initializeAspergillum(originalItem);
  const itemState = readAspergillumState(item);
  const level = readAspersoriumWater(block);
  const resolution = resolveDocking(level, itemState.charges);
  const dimensionId = block.dimension.id;
  let previousSnapshot;
  try {
    previousSnapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Docked registry could not be read: ${String(error)}`);
    action(player, ACTION_MESSAGES.registryRepairRequired);
    return;
  }
  if (previousSnapshot !== undefined) {
    console.error(`[Aspergillum] Refusing to overwrite orphaned docked snapshot at ${dimensionId} ${JSON.stringify(block.location)}`);
    action(player, ACTION_MESSAGES.registryRecoveryRequired);
    return;
  }
  const snapshot = captureDockedAspergillum(item, resolution.remainingCharges);
  const originalPermutation = block.permutation;
  const updatedPermutation = withCustomBlockState(
    withAspersoriumWater(originalPermutation, resolution.nextWater),
    DOCKED_STATE,
    true,
  );
  try {
    setDockedSnapshot(dimensionId, block.location, snapshot);
    setMainhand(player, undefined);
    block.setPermutation(updatedPermutation);
  } catch (error) {
    try { setMainhand(player, originalItem); } catch { /* defensive rollback */ }
    try { block.setPermutation(originalPermutation); } catch { /* defensive rollback */ }
    try { deleteDockedSnapshot(dimensionId, block.location); } catch { /* defensive rollback */ }
    console.error(`[Aspergillum] Dock transaction failed: ${String(error)}`);
    action(player, ACTION_MESSAGES.dockingCancelled);
    return;
  }
  audioPort.emit(player, {
    kind: "dock.commit",
    transferred: resolution.transferredCharges as 0 | TransferAmount,
    location: aspersoriumAcousticCenter(block.location),
    actionId: `${player.id}:${system.currentTick}:dock`,
  });
  if (resolution.transferredCharges === 0 && resolution.remainingCharges === 0) {
    action(player, ACTION_MESSAGES.docked);
  } else if (resolution.remainingCharges === 0) {
    action(player, ACTION_MESSAGES.dockedTransferred, resolution.transferredCharges);
  } else if (resolution.transferredCharges === 0) {
    action(player, ACTION_MESSAGES.dockedRetained, resolution.remainingCharges);
  } else {
    action(
      player,
      ACTION_MESSAGES.dockedPartial,
      resolution.transferredCharges,
      resolution.remainingCharges,
    );
  }
}

function undockItem(player: Player, block: Block): void {
  if (resolvePlayerPolicies(player).denied) return;
  if (!getBooleanState(block, DOCKED_STATE)) return;
  const dimensionId = block.dimension.id;
  let snapshot;
  try {
    snapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Docked registry could not be read: ${String(error)}`);
    action(player, ACTION_MESSAGES.registryRepairRequired);
    return;
  }
  const restoredItem = snapshot === undefined ? createAspergillum(0) : restoreDockedAspergillum(snapshot);
  const originalPermutation = block.permutation;
  const updatedPermutation = withCustomBlockState(originalPermutation, DOCKED_STATE, false);
  try {
    block.setPermutation(updatedPermutation);
    if (snapshot !== undefined) deleteDockedSnapshot(dimensionId, block.location);
    giveOrDrop(player, restoredItem);
  } catch (error) {
    try { block.setPermutation(originalPermutation); } catch { /* defensive rollback */ }
    if (snapshot !== undefined) {
      try { setDockedSnapshot(dimensionId, block.location, snapshot); } catch { /* defensive rollback */ }
    }
    console.error(`[Aspergillum] Undock transaction failed: ${String(error)}`);
    action(player, ACTION_MESSAGES.undockingCancelled);
    return;
  }
  audioPort.emit(player, {
    kind: "undock.commit",
    location: aspersoriumAcousticCenter(block.location),
    actionId: `${player.id}:${system.currentTick}:undock`,
  });
  action(player, ACTION_MESSAGES.undocked);
}

export function handleAspersoriumBreak(event: BlockComponentBlockBreakEvent): void {
  if (event.brokenBlockPermutation.type.id !== ASPERSORIUM_BLOCK) return;
  const location = { ...event.block.location };
  const dimension = event.dimension;
  const dimensionId = dimension.id;
  cancelLoadingAtBlock(dimensionId, location);
  if (event.brokenBlockPermutation.getAllStates()[DOCKED_STATE] !== true) return;

  system.run(() => {
    try {
      const snapshot = getDockedSnapshot(dimensionId, location);
      const recovered = snapshot === undefined ? createAspergillum(0) : restoreDockedAspergillum(snapshot);
      dimension.spawnItem(recovered, {
        x: location.x + 0.5,
        y: location.y + 0.35,
        z: location.z + 0.5,
      });
      if (snapshot !== undefined) deleteDockedSnapshot(dimensionId, location);
    } catch (error) {
      console.error(`[Aspergillum] Could not recover docked item after block destruction: ${String(error)}`);
    }
  });
}

function scheduleAspersoriumInteraction(
  player: Player,
  block: Block,
  intent: AspersoriumInteractionIntent,
): void {
  if (!claimAspersoriumInteraction(player, block)) return;
  system.run(() => {
    if (!player.isValid || !block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return;
    const item = getMainhand(player);
    const activeAction = getActionLease(player.id);
    if (activeAction !== undefined) {
      action(player, ACTION_MESSAGES.actionBusy);
      return;
    }
    const lockOwner = getLoadingBlockOwner(block.dimension.id, block.location);
    if (lockOwner !== undefined) {
      action(player, lockOwner === player.id ? ACTION_MESSAGES.alreadyLoading : ACTION_MESSAGES.aspersoriumBusy);
      return;
    }

    if (item?.typeId === "minecraft:water_bucket") {
      fillFromBucket(player, block);
      return;
    }
    if (getBooleanState(block, DOCKED_STATE)) {
      if (item === undefined) undockItem(player, block);
      else if (isAspergillum(item)) {
        action(player, ACTION_MESSAGES.aspersoriumAlreadyContains);
      } else {
        action(player, ACTION_MESSAGES.emptyHandRequired);
      }
      return;
    }
    if (isAspergillum(item)) {
      if (intent === "dock") dockItem(player, block);
      else loadItem(player, block);
      return;
    }
    action(player, ACTION_MESSAGES.interactionHint);
  });
}

export function handleAspergillumUseOn(player: Player, block: Block, isSneaking: boolean): void {
  if (block.typeId !== ASPERSORIUM_BLOCK) return;
  scheduleAspersoriumInteraction(player, block, isSneaking ? "dock" : "load");
}

export function handleAspersoriumInteraction(event: BlockComponentPlayerInteractEvent): void {
  const player = event.player;
  if (player === undefined || event.block.typeId !== ASPERSORIUM_BLOCK) return;

  // Capture the input intent while the engine event is being dispatched. Reading
  // isSneaking only in the deferred callback races the player's next input state.
  let isSneaking: boolean;
  try {
    isSneaking = player.isSneaking;
  } catch {
    return;
  }
  scheduleAspersoriumInteraction(player, event.block, isSneaking ? "dock" : "load");
}
