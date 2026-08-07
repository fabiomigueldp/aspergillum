import { system, type Vector3 } from "@minecraft/server";
import type { SprayBasis } from "../domain/cone";
import { acquireActionLease, releaseActionLease } from "./action-lease";

export type SprinklePhase = "reserved" | "released";

export interface SprinkleSession {
  readonly playerId: string;
  readonly itemInstanceId: string;
  readonly slot: number;
  readonly dimensionId: string;
  readonly sprayProfileId: string;
  readonly startedAtTick: number;
  readonly leaseToken: string;
  readonly runIds: number[];
  phase: SprinklePhase;
  basis: SprayBasis;
  steeringDirection: Vector3;
}

export type StartSprinkleResult =
  | { readonly status: "started"; readonly session: SprinkleSession }
  | { readonly status: "busy" };

const sessions = new Map<string, SprinkleSession>();

export function startSprinkleSession(
  input: Omit<SprinkleSession, "startedAtTick" | "leaseToken" | "runIds" | "phase">,
): StartSprinkleResult {
  if (sessions.has(input.playerId)) return { status: "busy" };
  const leaseResult = acquireActionLease(input.playerId, "sprinkling", system.currentTick);
  if (leaseResult.status === "busy") return { status: "busy" };
  const session: SprinkleSession = {
    ...input,
    startedAtTick: system.currentTick,
    leaseToken: leaseResult.lease.token,
    runIds: [],
    phase: "reserved",
  };
  sessions.set(input.playerId, session);
  return { status: "started", session };
}

export function getSprinkleSession(playerId: string): SprinkleSession | undefined {
  return sessions.get(playerId);
}

export function isCurrentSprinkleSession(session: SprinkleSession): boolean {
  return sessions.get(session.playerId) === session;
}

export function trackSprinkleRun(session: SprinkleSession, runId: number): void {
  if (isCurrentSprinkleSession(session)) session.runIds.push(runId);
  else system.clearRun(runId);
}

export function markSprinkleReleased(session: SprinkleSession): boolean {
  if (!isCurrentSprinkleSession(session) || session.phase !== "reserved") return false;
  session.phase = "released";
  return true;
}

export function cancelSprinkleSession(playerId: string): SprinkleSession | undefined {
  const session = sessions.get(playerId);
  if (session === undefined) return undefined;
  sessions.delete(playerId);
  for (const runId of session.runIds) system.clearRun(runId);
  releaseActionLease(playerId, session.leaseToken);
  return session;
}

export function completeSprinkleSession(session: SprinkleSession): boolean {
  if (!isCurrentSprinkleSession(session)) return false;
  sessions.delete(session.playerId);
  releaseActionLease(session.playerId, session.leaseToken);
  return true;
}
