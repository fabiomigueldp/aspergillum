import {
  ItemComponentTypes,
  MolangVariableMap,
  Player,
  system,
} from "@minecraft/server";
import { canSprinkle, resolveSprinkle } from "../domain/aspergillum";
import {
  aspergillumTipOrigin,
  createSprayBasis,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
  steerDirection,
  transportSprayBasis,
} from "../domain/cone";
import { STANDARD_SPRAY_PROFILE } from "../domain/spray-profile";
import { getActionLease } from "../infrastructure/action-lease";
import { DROPLET_PARTICLE } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  getMainhand,
  initializeAspergillum,
  isAspergillum,
  isAspergillumSchemaSupported,
  readAspergillumInstanceId,
  readAspergillumState,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
import { action } from "../infrastructure/messaging";
import {
  cancelSprinkleSession,
  completeSprinkleSession,
  getSprinkleSession,
  isCurrentSprinkleSession,
  markSprinkleReleased,
  startSprinkleSession,
  trackSprinkleRun,
  type SprinkleSession,
} from "../infrastructure/sprinkle-session";
import { playSprinkleRecoveryBridge } from "../presentation/animation-coordinator";

const lastSprinkleTick = new Map<string, number>();

function hasAuthorizedItem(player: Player, session: SprinkleSession): boolean {
  if (!player.isValid || player.dimension.id !== session.dimensionId) return false;
  if (player.selectedSlotIndex !== session.slot) return false;
  const item = getMainhand(player);
  return isAspergillum(item) && readAspergillumInstanceId(item) === session.itemInstanceId;
}

function emitWaterFrame(player: Player, session: SprinkleSession, pulseIndex: number): void {
  if (!isCurrentSprinkleSession(session) || !hasAuthorizedItem(player, session)) {
    cancelSprinkleSession(player.id);
    return;
  }

  const profile = STANDARD_SPRAY_PROFILE;
  const targetDirection = player.getViewDirection();
  const steered = steerDirection(
    session.steeringDirection,
    targetDirection,
    profile.steeringResponsiveness,
    profile.maximumTurnDegrees,
  );
  session.basis = transportSprayBasis(session.basis, steered);
  session.steeringDirection = session.basis.forward;

  const origin = aspergillumTipOrigin(
    player.getHeadLocation(),
    session.steeringDirection,
    session.basis.right,
    profile,
  );
  const directions = deterministicDropletDirections(
    session.steeringDirection,
    profile.dropletCount,
    session.basis.right,
    profile,
  );

  for (const dropletIndex of dropletIndicesForFrame(profile.dropletCount, profile.pulseCount, pulseIndex)) {
    const dropletDirection = directions[dropletIndex];
    if (dropletDirection === undefined) continue;
    const variables = new MolangVariableMap();
    variables.setSpeedAndDirection(
      "variable.aspergillum_motion",
      deterministicDropletSpeed(dropletIndex, profile),
      dropletDirection,
    );
    variables.setFloat(
      "variable.aspergillum_scale",
      profile.minimumScale + (dropletIndex % profile.scaleVariants) * profile.scaleStep,
    );
    player.dimension.spawnParticle(DROPLET_PARTICLE, origin, variables);
  }
}

function presentChargeState(player: Player, charges: number, creative: boolean): void {
  if (creative) {
    action(player, "§bÁgua benta: ∞ §7• Criativo", "§bHoly water: ∞ §7• Creative");
    return;
  }
  action(player, `§b${charges}§7/3 cargas restantes`, `§b${charges}§7/3 charges remaining`);
}

function commitSprinkleRelease(player: Player, session: SprinkleSession): void {
  if (!isCurrentSprinkleSession(session) || session.phase !== "reserved" || !hasAuthorizedItem(player, session)) {
    cancelSprinkleSession(player.id);
    return;
  }

  const policies = resolvePlayerPolicies(player);
  if (policies.denied) {
    cancelSprinkleSession(player.id);
    return;
  }
  const currentItem = getMainhand(player);
  if (!isAspergillum(currentItem)) {
    cancelSprinkleSession(player.id);
    return;
  }
  const resolution = resolveSprinkle(readAspergillumState(currentItem), policies.chargePolicy);
  if (!resolution.allowed) {
    cancelSprinkleSession(player.id);
    return;
  }

  try {
    setMainhand(player, writeAspergillumState(currentItem, resolution.state));
  } catch (error) {
    console.error(`[Aspergillum] Sprinkle release commit failed for ${player.id}: ${String(error)}`);
    cancelSprinkleSession(player.id);
    return;
  }
  if (!markSprinkleReleased(session)) return;
  presentChargeState(player, resolution.state.charges, policies.creative);
  emitWaterFrame(player, session, 0);

  for (let pulseIndex = 1; pulseIndex < STANDARD_SPRAY_PROFILE.pulseCount; pulseIndex += 1) {
    trackSprinkleRun(session, system.runTimeout(() => emitWaterFrame(player, session, pulseIndex), pulseIndex));
  }
}

function scheduleSprinkle(player: Player, session: SprinkleSession): void {
  trackSprinkleRun(
    session,
    system.runTimeout(
      () => commitSprinkleRelease(player, session),
      STANDARD_SPRAY_PROFILE.releaseDelayTicks,
    ),
  );
  trackSprinkleRun(
    session,
    system.runTimeout(
      () => completeSprinkleSession(session),
      STANDARD_SPRAY_PROFILE.actionDurationTicks,
    ),
  );
}

export function cancelWaterSpray(playerId: string): void {
  cancelSprinkleSession(playerId);
}

export function clearSprinklePlayerState(playerId: string): void {
  lastSprinkleTick.delete(playerId);
  cancelSprinkleSession(playerId);
}

export function trySprinkle(player: Player): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  if (!isAspergillumSchemaSupported(rawItem)) {
    action(player, "§cEste aspersório pertence a uma versão mais recente.", "§cThis aspergillum belongs to a newer version.");
    return;
  }
  const item = initializeAspergillum(rawItem);
  setMainhand(player, item);
  const itemInstanceId = readAspergillumInstanceId(item);
  if (itemInstanceId === undefined) return;
  if (getActionLease(player.id) !== undefined) return;

  const now = system.currentTick;
  if (!canSprinkle(lastSprinkleTick.get(player.id), now)) return;

  const preview = resolveSprinkle(readAspergillumState(item), policies.chargePolicy);
  if (!preview.allowed) {
    lastSprinkleTick.set(player.id, now);
    player.playSound("random.click", { pitch: 0.72, volume: 0.45 });
    action(
      player,
      "§7O aspersório está vazio. Use-o numa caldeirinha com água.",
      "§7The aspergillum is empty. Use it on a filled aspersorium.",
    );
    return;
  }

  const initialDirection = player.getViewDirection();
  const started = startSprinkleSession({
    playerId: player.id,
    itemInstanceId,
    slot: player.selectedSlotIndex,
    dimensionId: player.dimension.id,
    steeringDirection: initialDirection,
    basis: createSprayBasis(initialDirection),
  });
  if (started.status === "busy") return;

  lastSprinkleTick.set(player.id, now);
  playSprinkleRecoveryBridge(player);
  try {
    item.getComponent(ItemComponentTypes.Cooldown)?.startCooldown(player);
  } catch (error) {
    console.warn(`[Aspergillum] Unable to start native cooldown for ${player.id}: ${String(error)}`);
  }
  scheduleSprinkle(player, started.session);
}

export { getSprinkleSession };
