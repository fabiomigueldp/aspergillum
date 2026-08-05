import type { Player } from "@minecraft/server";
import { AUDIO_VARIANTS, familiesForCue, isWorldCue, type AudioFamily } from "./audio-catalog";
import type { AudioCue, AudioPort } from "./audio-port";
import { VariantShuffleBag } from "./variant-shuffle-bag";

class BedrockAudioAdapter implements AudioPort {
  readonly #bags = new Map<string, VariantShuffleBag<string>>();

  emit(player: Player, cue: AudioCue): void {
    for (const family of familiesForCue(cue)) {
      const event = this.#nextVariant(player.id, family);
      try {
        if (isWorldCue(cue)) player.dimension.playSound(event, cue.location);
        else if (cue.kind === "load.prepare") player.playSound(event, { location: cue.location });
        else player.playSound(event);
      } catch (error) {
        const location = "location" in cue
          ? ` location=${cue.location.x.toFixed(2)},${cue.location.y.toFixed(2)},${cue.location.z.toFixed(2)}`
          : "";
        console.warn(
          `[Aspergillum][audio] cue=${cue.kind} event=${event} player=${player.id}`
          + ` action=${cue.actionId}${location} error=${String(error)}`,
        );
      }
    }
  }

  clearPlayer(playerId: string): void {
    for (const key of this.#bags.keys()) {
      if (key.startsWith(`${playerId}|`)) this.#bags.delete(key);
    }
  }

  #nextVariant(playerId: string, family: AudioFamily): string {
    const key = `${playerId}|${family}`;
    let bag = this.#bags.get(key);
    if (bag === undefined) {
      bag = new VariantShuffleBag(AUDIO_VARIANTS[family]);
      this.#bags.set(key, bag);
    }
    return bag.next();
  }
}

export const audioPort: AudioPort = new BedrockAudioAdapter();
