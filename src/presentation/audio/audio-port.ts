import type { Player, Vector3 } from "@minecraft/server";

export type TransferAmount = 1 | 2 | 3 | 4;

export type AudioCue =
  | { readonly kind: "aspersorium.fill"; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "load.prepare"; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "load.commit"; readonly amount: TransferAmount; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "dock.commit"; readonly returned: 0 | TransferAmount; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "undock.commit"; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "sprinkle.prepare"; readonly actionId: string }
  | { readonly kind: "sprinkle.release"; readonly location: Vector3; readonly actionId: string }
  | { readonly kind: "dry"; readonly actionId: string };

export interface AudioPort {
  emit(player: Player, cue: AudioCue): void;
  clearPlayer(playerId: string): void;
}
