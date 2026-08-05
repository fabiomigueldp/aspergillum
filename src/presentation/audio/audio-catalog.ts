import type { AudioCue } from "./audio-port";

export const AUDIO_VARIANTS = {
  "aspersorium.fill": [1, 2, 3, 4].map((index) => `aspergillum.aspersorium.fill.v${String(index).padStart(2, "0")}`),
  "load.prepare": [1, 2, 3].map((index) => `aspergillum.load.prepare.v${String(index).padStart(2, "0")}`),
  "load.commit.1": [1, 2, 3].map((index) => `aspergillum.load.commit.1.v${String(index).padStart(2, "0")}`),
  "load.commit.2": [1, 2, 3].map((index) => `aspergillum.load.commit.2.v${String(index).padStart(2, "0")}`),
  "load.commit.3": [1, 2, 3].map((index) => `aspergillum.load.commit.3.v${String(index).padStart(2, "0")}`),
  "load.commit.4": [1, 2, 3, 4].map((index) => `aspergillum.load.commit.4.v${String(index).padStart(2, "0")}`),
  "dock.mechanical": [1, 2, 3].map((index) => `aspergillum.dock.mechanical.v${String(index).padStart(2, "0")}`),
  "dock.water.1": [1, 2].map((index) => `aspergillum.dock.water.1.v${String(index).padStart(2, "0")}`),
  "dock.water.2": [1, 2].map((index) => `aspergillum.dock.water.2.v${String(index).padStart(2, "0")}`),
  "dock.water.3": [1, 2].map((index) => `aspergillum.dock.water.3.v${String(index).padStart(2, "0")}`),
  "dock.water.4": [1, 2, 3].map((index) => `aspergillum.dock.water.4.v${String(index).padStart(2, "0")}`),
  undock: [1, 2, 3].map((index) => `aspergillum.undock.v${String(index).padStart(2, "0")}`),
  "sprinkle.prepare": [1, 2, 3, 4].map((index) => `aspergillum.sprinkle.prepare.v${String(index).padStart(2, "0")}`),
  "sprinkle.release": [1, 2, 3, 4, 5, 6].map((index) => `aspergillum.sprinkle.release.v${String(index).padStart(2, "0")}`),
  dry: [1, 2, 3].map((index) => `aspergillum.dry.v${String(index).padStart(2, "0")}`),
} as const satisfies Record<string, readonly string[]>;

export type AudioFamily = keyof typeof AUDIO_VARIANTS;

export function familiesForCue(cue: AudioCue): readonly AudioFamily[] {
  switch (cue.kind) {
    case "aspersorium.fill": return ["aspersorium.fill"];
    case "load.prepare": return ["load.prepare"];
    case "load.commit": return [`load.commit.${cue.amount}`];
    case "dock.commit": return cue.returned === 0
      ? ["dock.mechanical"]
      : ["dock.mechanical", `dock.water.${cue.returned}`];
    case "undock.commit": return ["undock"];
    case "sprinkle.prepare": return ["sprinkle.prepare"];
    case "sprinkle.release": return ["sprinkle.release"];
    case "dry": return ["dry"];
  }
}

export function isWorldCue(cue: AudioCue): cue is Exclude<AudioCue,
  { readonly kind: "load.prepare" | "sprinkle.prepare" | "dry" }
> {
  return cue.kind !== "load.prepare" && cue.kind !== "sprinkle.prepare" && cue.kind !== "dry";
}
