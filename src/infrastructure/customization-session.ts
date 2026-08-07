export interface CustomizationSession {
  readonly playerId: string;
  readonly blockKey: string;
  readonly startedAtTick: number;
}

export type AcquireCustomizationSessionResult =
  | { readonly status: "acquired"; readonly session: CustomizationSession }
  | { readonly status: "player_busy" }
  | { readonly status: "block_busy"; readonly ownerId: string };

const sessionsByPlayer = new Map<string, CustomizationSession>();
const ownersByBlock = new Map<string, string>();

export function customizationBlockKey(
  dimensionId: string,
  location: { readonly x: number; readonly y: number; readonly z: number },
): string {
  return `${dimensionId}|${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

export function acquireCustomizationSession(
  playerId: string,
  dimensionId: string,
  location: { readonly x: number; readonly y: number; readonly z: number },
  startedAtTick: number,
): AcquireCustomizationSessionResult {
  if (sessionsByPlayer.has(playerId)) return { status: "player_busy" };
  const blockKey = customizationBlockKey(dimensionId, location);
  const ownerId = ownersByBlock.get(blockKey);
  if (ownerId !== undefined) return { status: "block_busy", ownerId };
  const session = { playerId, blockKey, startedAtTick };
  sessionsByPlayer.set(playerId, session);
  ownersByBlock.set(blockKey, playerId);
  return { status: "acquired", session };
}

export function releaseCustomizationSession(playerId: string): boolean {
  const session = sessionsByPlayer.get(playerId);
  if (session === undefined) return false;
  sessionsByPlayer.delete(playerId);
  if (ownersByBlock.get(session.blockKey) === playerId) ownersByBlock.delete(session.blockKey);
  return true;
}

export function releaseCustomizationAtBlock(
  dimensionId: string,
  location: { readonly x: number; readonly y: number; readonly z: number },
): boolean {
  const ownerId = ownersByBlock.get(customizationBlockKey(dimensionId, location));
  return ownerId === undefined ? false : releaseCustomizationSession(ownerId);
}

export function isCurrentCustomizationSession(session: CustomizationSession): boolean {
  return sessionsByPlayer.get(session.playerId) === session
    && ownersByBlock.get(session.blockKey) === session.playerId;
}
