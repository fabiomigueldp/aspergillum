import type { Player, PlayerSoundOptions } from "@minecraft/server";

export const SOUND_CUES = {
  aspersoriumFill: { id: "bucket.empty_water", pitch: 1.08, volume: 0.75 },
  dock: { id: "armor.equip_chain", pitch: 0.92, volume: 0.58 },
  dry: { id: "random.click", pitch: 0.72, volume: 0.45 },
  loadCommit: { id: "cauldron.takewater", pitch: 1.32, volume: 0.78 },
  loadPrepare: { id: "armor.equip_chain", pitch: 1.18, volume: 0.32 },
  undock: { id: "armor.equip_chain", pitch: 1.12, volume: 0.55 },
} as const satisfies Record<string, { readonly id: string; readonly pitch: number; readonly volume: number }>;

export type SoundCue = keyof typeof SOUND_CUES;

export function playSoundCue(player: Player, cue: SoundCue): void {
  const { id, pitch, volume } = SOUND_CUES[cue];
  const options: PlayerSoundOptions = { pitch, volume };
  try {
    player.playSound(id, options);
  } catch (error) {
    // Sound is fail-soft presentation and never participates in a transaction.
    console.warn(`[Aspergillum] Unable to play ${cue} (${id}) for ${player.id}: ${String(error)}`);
  }
}
