import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ACTION_MESSAGES } from "../../src/presentation/messaging";
import { LOAD_SPLASH_OFFSETS } from "../../src/presentation/wet-feedback";
import { AUDIO_VARIANTS, familiesForCue } from "../../src/presentation/audio/audio-catalog";

const root = path.resolve(import.meta.dirname, "../..");
const loreKeys = [
  "item.aspergillum.lore.charges",
  "item.aspergillum.lore.profile",
  "item.aspergillum.lore.appearance",
  "item.aspergillum.lore.grip",
  "item.aspergillum.lore.instructions",
  "item.aspergillum.lore.docking",
  "item.aspergillum.lore.creative",
] as const;

function localeEntries(locale: "pt_BR" | "en_US"): Map<string, string> {
  const source = fs.readFileSync(path.join(root, "packs", "resource", "texts", `${locale}.lang`), "utf8");
  return new Map(source.split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    return separator <= 0 ? [] : [[line.slice(0, separator), line.slice(separator + 1)]];
  }));
}

function substituteSequentially(template: string, parameters: string[]): string {
  return parameters.reduce((result, parameter) => result.replace("%s", parameter), template);
}

describe("release UX contracts", () => {
  it("uses a unique client-localized key for every action-bar message", () => {
    const keys = Object.values(ACTION_MESSAGES);
    expect(keys).toHaveLength(32);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => key.startsWith("message.aspergillum."))).toBe(true);
  });

  it("uses runtime-safe sequential placeholders without leaking percent signs", () => {
    const dynamicKeys = new Map<string, string[]>([
      ["item.aspergillum.lore.charges", ["2", "4"]],
      [ACTION_MESSAGES.chargesInspect, ["2"]],
      [ACTION_MESSAGES.chargesLoaded, ["4"]],
      [ACTION_MESSAGES.chargesRemaining, ["1"]],
      [ACTION_MESSAGES.dockedPartial, ["2", "2"]],
      [ACTION_MESSAGES.dockedRetained, ["4"]],
      [ACTION_MESSAGES.dockedTransferred, ["4"]],
    ]);
    for (const locale of ["pt_BR", "en_US"] as const) {
      const entries = localeEntries(locale);
      for (const [key, parameters] of dynamicKeys) {
        const template = entries.get(key) ?? "";
        expect(template.match(/%s/g)).toHaveLength(parameters.length);
        expect(template).not.toMatch(/%%\d|%\d(?:\$s)?/);
        expect(substituteSequentially(template, parameters)).not.toContain("%");
      }
    }
  });

  it("explicitly resets inherited lore styling before applying project colors", () => {
    for (const locale of ["pt_BR", "en_US"] as const) {
      const entries = localeEntries(locale);
      for (const key of [...loreKeys, ...Object.values(ACTION_MESSAGES)]) {
        expect(entries.get(key)).toMatch(/^§r§[0-9a-f]/);
      }
      for (const key of loreKeys) {
        expect(entries.get(key)).not.toContain("§o");
      }
    }
  });

  it("presents the four-charge capacity consistently in both locales", () => {
    const chargeKeys = [
      ACTION_MESSAGES.chargesInspect,
      ACTION_MESSAGES.chargesLoaded,
      ACTION_MESSAGES.chargesRemaining,
    ];
    for (const locale of ["pt_BR", "en_US"] as const) {
      const entries = localeEntries(locale);
      for (const key of chargeKeys) {
        expect(entries.get(key)).toContain("/4");
        expect(entries.get(key)).not.toContain("/3");
      }
    }
  });

  it("exposes exactly 48 authored variants through namespaced semantic events", () => {
    const variants = Object.values(AUDIO_VARIANTS).flat();
    expect(variants).toHaveLength(48);
    expect(new Set(variants).size).toBe(variants.length);
    expect(variants.every((event) => event.startsWith("aspergillum."))).toBe(true);
    expect(variants.every((event) => /\.v\d{2}$/.test(event))).toBe(true);
  });

  it("layers docking water audio only for charges actually transferred", () => {
    const base = { location: { x: 0, y: 0, z: 0 }, actionId: "dock-test" } as const;
    expect(familiesForCue({ kind: "dock.commit", transferred: 0, ...base }))
      .toEqual(["dock.mechanical"]);
    expect(familiesForCue({ kind: "dock.commit", transferred: 2, ...base }))
      .toEqual(["dock.mechanical", "dock.water.2"]);
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
