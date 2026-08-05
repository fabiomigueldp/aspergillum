import { describe, expect, it } from "vitest";
import { ACTION_MESSAGES } from "../../src/presentation/messaging";
import { LOAD_SPLASH_OFFSETS } from "../../src/presentation/wet-feedback";
import { SOUND_CUES } from "../../src/presentation/sound-coordinator";

describe("release UX contracts", () => {
  it("uses a unique client-localized key for every action-bar message", () => {
    const keys = Object.values(ACTION_MESSAGES);
    expect(keys).toHaveLength(25);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => key.startsWith("message.aspergillum."))).toBe(true);
  });

  it("keeps every script-side sound cue within a restrained mix envelope", () => {
    for (const cue of Object.values(SOUND_CUES)) {
      expect(cue.id.length).toBeGreaterThan(0);
      expect(cue.pitch).toBeGreaterThan(0);
      expect(cue.pitch).toBeLessThanOrEqual(2);
      expect(cue.volume).toBeGreaterThan(0);
      expect(cue.volume).toBeLessThanOrEqual(1);
    }
  });

  it("limits loading feedback to two subtle particles inside the vessel footprint", () => {
    expect(LOAD_SPLASH_OFFSETS).toHaveLength(2);
    for (const offset of LOAD_SPLASH_OFFSETS) {
      expect(offset.x).toBeGreaterThan(0.35);
      expect(offset.x).toBeLessThan(0.65);
      expect(offset.y).toBeGreaterThan(0.5);
      expect(offset.y).toBeLessThan(0.8);
      expect(offset.z).toBeGreaterThan(0.35);
      expect(offset.z).toBeLessThan(0.65);
    }
  });
});
