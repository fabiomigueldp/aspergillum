import { system, type Vector3 } from "@minecraft/server";
import { acquireActionLease, releaseActionLease } from "./action-lease";

export interface LoadingSession {
  readonly playerId: string;
  readonly itemInstanceId: string;
  readonly slot: number;
  readonly dimensionId: string;
  readonly blockLocation: Vector3;
  readonly blockKey: string;
  readonly startedAtTick: number;
  readonly expectedWaterLevel: number;
  readonly leaseToken: string;
  commitRunId: number;
  finishRunId: number;
}

export type StartLoadingResult =
  | { readonly status: "started"; readonly session: LoadingSession }
  | { readonly status: "player_busy" }
  | { readonly status: "block_busy" };

const sessionsByPlayer = new Map<string, LoadingSession>();
const blockOwners = new Map<string, string>();

export function loadingBlockKey(dimensionId: string, location: Vector3): string {
  return `${dimensionId}|${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

function releaseSession(playerId: string): LoadingSession | undefined {
  const session = sessionsByPlayer.get(playerId);
  if (session === undefined) return undefined;
  sessionsByPlayer.delete(playerId);
  if (blockOwners.get(session.blockKey) === playerId) blockOwners.delete(session.blockKey);
  releaseActionLease(playerId, session.leaseToken);
  return session;
}

export function startLoadingSession(
  input: Omit<LoadingSession, "blockKey" | "startedAtTick" | "leaseToken" | "commitRunId" | "finishRunId">,
  onReady: (session: LoadingSession) => boolean,
  delayTicks = 10,
  actionDurationTicks = 16,
): StartLoadingResult {
  if (sessionsByPlayer.has(input.playerId)) return { status: "player_busy" };
  const blockKey = loadingBlockKey(input.dimensionId, input.blockLocation);
  if (blockOwners.has(blockKey)) return { status: "block_busy" };
  const leaseResult = acquireActionLease(input.playerId, "loading", system.currentTick);
  if (leaseResult.status === "busy") return { status: "player_busy" };

  const session: LoadingSession = {
    ...input,
    blockKey,
    startedAtTick: system.currentTick,
    leaseToken: leaseResult.lease.token,
    commitRunId: -1,
    finishRunId: -1,
  };
  sessionsByPlayer.set(input.playerId, session);
  blockOwners.set(blockKey, input.playerId);
  session.commitRunId = system.runTimeout(() => {
    if (sessionsByPlayer.get(input.playerId) !== session) return;
    if (!onReady(session)) cancelLoadingSession(input.playerId);
  }, delayTicks);
  session.finishRunId = system.runTimeout(() => {
    if (sessionsByPlayer.get(input.playerId) === session) releaseSession(input.playerId);
  }, Math.max(delayTicks + 1, actionDurationTicks));
  return { status: "started", session };
}

export function getLoadingSession(playerId: string): LoadingSession | undefined {
  return sessionsByPlayer.get(playerId);
}

export function cancelLoadingSession(playerId: string): boolean {
  const session = releaseSession(playerId);
  if (session === undefined) return false;
  if (session.commitRunId >= 0) system.clearRun(session.commitRunId);
  if (session.finishRunId >= 0) system.clearRun(session.finishRunId);
  return true;
}

export function getLoadingBlockOwner(dimensionId: string, location: Vector3): string | undefined {
  return blockOwners.get(loadingBlockKey(dimensionId, location));
}

export function cancelLoadingAtBlock(dimensionId: string, location: Vector3): boolean {
  const owner = getLoadingBlockOwner(dimensionId, location);
  return owner === undefined ? false : cancelLoadingSession(owner);
}
