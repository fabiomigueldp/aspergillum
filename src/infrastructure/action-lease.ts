export type PlayerActionKind = "loading" | "sprinkling" | "docking" | "undocking";

export interface ActionLease {
  readonly playerId: string;
  readonly kind: PlayerActionKind;
  readonly token: string;
  readonly acquiredAtTick: number;
}

export type AcquireActionLeaseResult =
  | { readonly status: "acquired"; readonly lease: ActionLease }
  | { readonly status: "busy"; readonly lease: ActionLease };

const leases = new Map<string, ActionLease>();
let leaseSequence = 0;

export function acquireActionLease(
  playerId: string,
  kind: PlayerActionKind,
  currentTick: number,
): AcquireActionLeaseResult {
  const existing = leases.get(playerId);
  if (existing !== undefined) return { status: "busy", lease: existing };
  leaseSequence += 1;
  const lease: ActionLease = {
    playerId,
    kind,
    acquiredAtTick: currentTick,
    token: `${playerId}:${currentTick}:${leaseSequence}`,
  };
  leases.set(playerId, lease);
  return { status: "acquired", lease };
}

export function getActionLease(playerId: string): ActionLease | undefined {
  return leases.get(playerId);
}

export function releaseActionLease(playerId: string, token?: string): boolean {
  const lease = leases.get(playerId);
  if (lease === undefined || (token !== undefined && lease.token !== token)) return false;
  leases.delete(playerId);
  return true;
}
