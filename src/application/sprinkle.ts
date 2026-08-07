import {
  ItemComponentTypes,
  MolangVariableMap,
  Player,
  system,
} from "@minecraft/server";
import { canSprinkle, equalAspergillumState, resolveSprinkle } from "../domain/aspergillum";
import {
  aspergillumTipOrigin,
  createSprayBasis,
  deterministicDropletDirections,
  deterministicDropletSpeed,
  dropletIndicesForFrame,
  steerDirection,
  transportSprayBasis,
} from "../domain/cone";
import { resolveSprayProfile } from "../domain/spray-profile";
import { getActionLease } from "../infrastructure/action-lease";
import { DROPLET_PARTICLE, RELEASE_BRIDGE_PARTICLE } from "../infrastructure/constants";
import { resolvePlayerPolicies } from "../infrastructure/game-mode-policy";
import {
  getMainhand,
  ensureInitializedAspergillumInMainhand,
  isAspergillum,
  isAspergillumSchemaSupported,
  readAspergillumInstanceId,
  readAspergillumState,
  setMainhand,
  writeAspergillumState,
} from "../infrastructure/item-state";
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
import { audioPort } from "../presentation/audio/bedrock-audio-adapter";
import { ACTION_MESSAGES, action } from "../presentation/messaging";

const lastSprinkleTick = new Map<string, number>();

function hasAuthorizedItem(player: Player, session: SprinkleSession): boolean {
  if (!player.isValid || player.dimension.id !== session.dimensionId) return false;
  if (player.selectedSlotIndex !== session.slot) return false;
  const item = getMainhand(player);
  return isAspergillum(item) && readAspergillumInstanceId(item) === session.itemInstanceId;
}

interface SprayFrame {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly directions: readonly { readonly x: number; readonly y: number; readonly z: number }[];
}

function computeSprayFrame(player: Player, session: SprinkleSession): SprayFrame {
  const profile = resolveSprayProfile(session.sprayProfileId);
  const targetDirection = player.getViewDirection();
  const steered = steerDirection(
    session.steeringDirection,
    targetDirection,
    profile.steeringResponsiveness,
    profile.maximumTurnDegrees,
  );
  session.basis = transportSprayBasis(session.basis, steered);
  session.steeringDirection = session.basis.forward;
  return {
    origin: aspergillumTipOrigin(
      player.getHeadLocation(),
      session.steeringDirection,
      session.basis.right,
      profile,
    ),
    directions: deterministicDropletDirections(
      session.steeringDirection,
      profile.dropletCount,
      session.basis.right,
      profile,
    ),
  };
}

function emitAuthorizedTipBridge(player: Player, frame: SprayFrame): void {
  const variables = new MolangVariableMap();
  variables.setSpeedAndDirection("variable.aspergillum_motion", 2.15, frame.directions[0] ?? { x: 0, y: 0, z: 1 });
  try {
    player.dimension.spawnParticle(RELEASE_BRIDGE_PARTICLE, frame.origin, variables);
  } catch (error) {
    console.warn(`[Aspergillum] Unable to emit authorized tip bridge for ${player.id}: ${String(error)}`);
  }
}

function emitWaterFrame(
  player: Player,
  session: SprinkleSession,
  pulseIndex: number,
  suppliedFrame?: SprayFrame,
): void {
  if (!isCurrentSprinkleSession(session) || !hasAuthorizedItem(player, session)) {
    cancelSprinkleSession(player.id);
    return;
  }

  const profile = resolveSprayProfile(session.sprayProfileId);
  const frame = suppliedFrame ?? computeSprayFrame(player, session);

  for (const dropletIndex of dropletIndicesForFrame(profile.dropletCount, profile.pulseCount, pulseIndex)) {
    const dropletDirection = frame.directions[dropletIndex];
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
    player.dimension.spawnParticle(DROPLET_PARTICLE, frame.origin, variables);
  }
}

function presentChargeState(player: Player, charges: number, creative: boolean): void {
  if (creative) {
    action(player, ACTION_MESSAGES.chargesCreative);
    return;
  }
  action(player, ACTION_MESSAGES.chargesRemaining, charges);
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

  if (!equalAspergillumState(readAspergillumState(currentItem), resolution.state)) {
    try {
      setMainhand(player, writeAspergillumState(currentItem, resolution.state));
    } catch (error) {
      console.error(`[Aspergillum] Sprinkle release commit failed for ${player.id}: ${String(error)}`);
      cancelSprinkleSession(player.id);
      return;
    }
  }
  if (!markSprinkleReleased(session)) return;
  presentChargeState(player, resolution.state.charges, policies.creative);
  const releaseFrame = computeSprayFrame(player, session);
  audioPort.emit(player, {
    kind: "sprinkle.release",
    location: releaseFrame.origin,
    actionId: session.leaseToken,
  });
  emitAuthorizedTipBridge(player, releaseFrame);
  emitWaterFrame(player, session, 0, releaseFrame);

  const profile = resolveSprayProfile(session.sprayProfileId);
  for (let pulseIndex = 1; pulseIndex < profile.pulseCount; pulseIndex += 1) {
    trackSprinkleRun(session, system.runTimeout(() => emitWaterFrame(player, session, pulseIndex), pulseIndex));
  }
}

function scheduleSprinkle(player: Player, session: SprinkleSession): void {
  const profile = resolveSprayProfile(session.sprayProfileId);
  trackSprinkleRun(
    session,
    system.runTimeout(
      () => commitSprinkleRelease(player, session),
      profile.releaseDelayTicks,
    ),
  );
  trackSprinkleRun(
    session,
    system.runTimeout(
      () => completeSprinkleSession(session),
      profile.actionDurationTicks,
    ),
  );
}

export function cancelWaterSpray(playerId: string): void {
  cancelSprinkleSession(playerId);
}

export function clearSprinklePlayerState(playerId: string): void {
  lastSprinkleTick.delete(playerId);
  cancelSprinkleSession(playerId);
  audioPort.clearPlayer(playerId);
}

export function trySprinkle(player: Player): void {
  const policies = resolvePlayerPolicies(player);
  if (policies.denied) return;
  const rawItem = getMainhand(player);
  if (!isAspergillum(rawItem)) return;
  if (!isAspergillumSchemaSupported(rawItem)) {
    action(player, ACTION_MESSAGES.futureSchema);
    return;
  }
  const item = ensureInitializedAspergillumInMainhand(player, rawItem);
  const itemInstanceId = readAspergillumInstanceId(item);
  if (itemInstanceId === undefined) return;
  if (getActionLease(player.id) !== undefined) return;

  const now = system.currentTick;
  if (!canSprinkle(lastSprinkleTick.get(player.id), now)) return;

  const itemState = readAspergillumState(item);
  const preview = resolveSprinkle(itemState, policies.chargePolicy);
  if (!preview.allowed) {
    lastSprinkleTick.set(player.id, now);
    audioPort.emit(player, { kind: "dry", actionId: `${player.id}:${now}:dry` });
    action(player, ACTION_MESSAGES.empty);
    return;
  }

  const initialDirection = player.getViewDirection();
  const started = startSprinkleSession({
    playerId: player.id,
    itemInstanceId,
    slot: player.selectedSlotIndex,
    dimensionId: player.dimension.id,
    sprayProfileId: resolveSprayProfile(itemState.sprayProfileId).id,
    steeringDirection: initialDirection,
    basis: createSprayBasis(initialDirection),
  });
  if (started.status === "busy") return;

  const cooldown = item.getComponent(ItemComponentTypes.Cooldown);
  if (cooldown === undefined) {
    cancelSprinkleSession(player.id);
    console.warn(`[Aspergillum] Native sprinkle cooldown is unavailable for ${player.id}`);
    return;
  }
  try {
    cooldown.startCooldown(player);
  } catch (error) {
    console.warn(`[Aspergillum] Unable to start native cooldown for ${player.id}: ${String(error)}`);
    cancelSprinkleSession(player.id);
    return;
  }
  lastSprinkleTick.set(player.id, now);
  playSprinkleRecoveryBridge(player);
  audioPort.emit(player, { kind: "sprinkle.prepare", actionId: started.session.leaseToken });
  scheduleSprinkle(player, started.session);
}

export { getSprinkleSession };
