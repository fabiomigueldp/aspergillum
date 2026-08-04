import {
  Block,
  BlockPermutation,
  BlockComponentBlockBreakEvent,
  BlockComponentPlayerInteractEvent,
  ItemStack,
  Player,
  system,
} from "@minecraft/server";
import { loadFromAspersorium, MAX_CHARGES } from "../domain/aspergillum";
import { resolveDocking } from "../domain/docking";
import { getActionLease } from "../infrastructure/action-lease";
import { ASPERSORIUM_BLOCK, DOCKED_STATE, WATER_LEVEL_STATE } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  captureDockedAspergillum,
  createAspergillum,
  getMainhand,
  giveOrDrop,
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
import { action } from "../infrastructure/messaging";
import { commitMainhandAndBlock } from "../infrastructure/minecraft-transaction";
import { playLoadingAnimation } from "../presentation/animation-coordinator";

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

function commitLoading(player: Player, session: LoadingSession): boolean {
  if (!player.isValid || player.id !== session.playerId) return false;
  if (player.dimension.id !== session.dimensionId || player.selectedSlotIndex !== session.slot) return false;
  const block = player.dimension.getBlock(session.blockLocation);
  if (block === undefined || !block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return false;
  if (!isWithinLoadingRange(player, block) || getBooleanState(block, DOCKED_STATE)) return false;

  const currentItem = getMainhand(player);
  if (!isAspergillum(currentItem)) return false;
  if (readAspergillumInstanceId(currentItem) !== session.itemInstanceId) return false;
  const currentLevel = getNumberState(block, WATER_LEVEL_STATE);
  if (currentLevel <= 0 || currentLevel !== session.expectedWaterLevel) return false;

  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return false;
  const result = loadFromAspersorium(readAspergillumState(currentItem), currentLevel, policies.waterPolicy);
  if (result.transferred === 0) return false;

  const originalPermutation = block.permutation;
  const updatedPermutation = withState(originalPermutation, WATER_LEVEL_STATE, result.nextWater);
  const updatedItem = writeAspergillumState(currentItem, result.state);
  if (!commitMainhandAndBlock(player, currentItem, updatedItem, block, originalPermutation, updatedPermutation)) {
    action(player, "§cO carregamento foi cancelado com segurança.", "§cLoading was safely cancelled.");
    return false;
  }
  player.playSound("cauldron.takewater", { pitch: 1.32, volume: 0.78 });
  action(
    player,
    policies.creative ? "§bÁgua benta: ∞ §7• Criativo" : `§b${result.state.charges}§7/3 cargas`,
    policies.creative ? "§bHoly water: ∞ §7• Creative" : `§b${result.state.charges}§7/3 charges`,
  );
  return true;
}

function loadItem(player: Player, block: Block): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  if (!isAspergillumSchemaSupported(rawItem)) {
    action(player, "§cEste aspersório pertence a uma versão mais recente.", "§cThis aspergillum belongs to a newer version.");
    return;
  }
  const initialItem = initializeAspergillum(rawItem);
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
    16,
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
  playLoadingAnimation(player);
  action(player, "§7Carregando o aspersório…", "§7Loading the aspergillum…");
}

function dockItem(player: Player, block: Block): void {
  const originalItem = getMainhand(player);
  if (!isAspergillum(originalItem) || getBooleanState(block, DOCKED_STATE)) return;
  if (!isAspergillumSchemaSupported(originalItem)) {
    action(player, "§cEste aspersório pertence a uma versão mais recente.", "§cThis aspergillum belongs to a newer version.");
    return;
  }
  const item = initializeAspergillum(originalItem);
  const itemState = readAspergillumState(item);
  const level = getNumberState(block, WATER_LEVEL_STATE);
  const resolution = resolveDocking(level, itemState.charges);
  if (!resolution.allowed) {
    action(
      player,
      "§cNão há espaço para toda a água do aspersório.",
      "§cThere is not enough room for all water in the aspergillum.",
    );
    return;
  }
  const dimensionId = block.dimension.id;
  let previousSnapshot;
  try {
    previousSnapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Docked registry could not be read: ${String(error)}`);
    action(player, "§cOs dados persistentes da caldeirinha precisam de reparo.", "§cThe aspersorium's persistent data requires repair.");
    return;
  }
  if (previousSnapshot !== undefined) {
    console.error(`[Aspergillum] Refusing to overwrite orphaned docked snapshot at ${dimensionId} ${JSON.stringify(block.location)}`);
    action(player, "§cA caldeirinha precisa ser recuperada antes do uso.", "§cThe aspersorium must be recovered before use.");
    return;
  }
  const snapshot = captureDockedAspergillum(item);
  const originalPermutation = block.permutation;
  const updatedPermutation = withState(
    withState(originalPermutation, WATER_LEVEL_STATE, resolution.nextWater),
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
    action(player, "§cO encaixe foi cancelado com segurança.", "§cDocking was safely cancelled.");
    return;
  }
  player.playSound("armor.equip_chain", { pitch: 0.92, volume: 0.58 });
  action(player, "§7Aspersório acomodado na caldeirinha.", "§7Aspergillum placed in the aspersorium.");
}

function undockItem(player: Player, block: Block): void {
  if (!getBooleanState(block, DOCKED_STATE)) return;
  const dimensionId = block.dimension.id;
  let snapshot;
  try {
    snapshot = getDockedSnapshot(dimensionId, block.location);
  } catch (error) {
    console.error(`[Aspergillum] Docked registry could not be read: ${String(error)}`);
    action(player, "§cOs dados persistentes da caldeirinha precisam de reparo.", "§cThe aspersorium's persistent data requires repair.");
    return;
  }
  const restoredItem = snapshot === undefined ? createAspergillum(0) : restoreDockedAspergillum(snapshot);
  const originalPermutation = block.permutation;
  const updatedPermutation = withState(originalPermutation, DOCKED_STATE, false);
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
    action(player, "§cA retirada foi cancelada com segurança.", "§cRetrieval was safely cancelled.");
    return;
  }
  player.playSound("armor.equip_chain", { pitch: 1.12, volume: 0.55 });
  action(player, "§7Aspersório retirado.", "§7Aspergillum retrieved.");
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
      action(player, "§7Aguarde a ação atual terminar.", "§7Wait for the current action to finish.");
      return;
    }
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
      if (item === undefined) undockItem(player, block);
      else if (isAspergillum(item)) {
        action(player, "§7A caldeirinha já contém um aspersório.", "§7The aspersorium already contains an aspergillum.");
      } else {
        action(player, "§7Use a mão vazia para retirar o aspersório.", "§7Use an empty hand to retrieve the aspergillum.");
      }
      return;
    }
    if (isAspergillum(item)) {
      if (intent === "dock") dockItem(player, block);
      else loadItem(player, block);
      return;
    }
    action(player, "§7Use um balde d'água ou o aspersório.", "§7Use a water bucket or the aspergillum.");
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
