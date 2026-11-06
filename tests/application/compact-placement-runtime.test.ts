import type { BlockComponentPlayerPlaceBeforeEvent, BlockCustomComponent, CustomComponentParameters, ItemCustomComponent, Player, StartupEvent } from "@minecraft/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({ startup: undefined as undefined | ((event: StartupEvent) => void) }));
vi.mock("@minecraft/server", async () => {
  const runtime = await import("../mocks/compact-runtime");
  const ignoredEvents = new Proxy({}, { get: () => ({ subscribe: vi.fn() }) });
  return {
    ...runtime,
    Player: runtime.FakePlayer,
    BlockPermutation: runtime.FakePermutation,
    EntitySwingSource: { Attack: "attack", Mine: "mine" },
    PlayerInventoryType: { Hotbar: "hotbar" },
    system: { ...runtime.system, beforeEvents: { startup: { subscribe: (callback: (event: StartupEvent) => void) => { engine.startup = callback; } } } },
    world: { ...runtime.world, beforeEvents: ignoredEvents, afterEvents: ignoredEvents },
  };
});
vi.mock("../../src/application/aspersorium", () => ({ handleAspergillumUseOn: vi.fn(), handleAspersoriumBreak: vi.fn(), handleAspersoriumInteraction: vi.fn() }));
vi.mock("../../src/application/sacristan-table", () => ({ clearCustomizationPlayerState: vi.fn(), handleSacristanTableBreak: vi.fn(), handleSacristanTableInteraction: vi.fn(), handleSacristanTableUseOn: vi.fn() }));
vi.mock("../../src/application/sprinkle", () => ({ cancelWaterSpray: vi.fn(), clearSprinklePlayerState: vi.fn(), getSprinkleSession: vi.fn(), trySprinkle: vi.fn() }));
vi.mock("../../src/presentation/aspersorium-water-visual", () => ({ reconcileLoadedAspersoriumWaterVisual: vi.fn(), scheduleAspersoriumWaterVisualReconciliation: vi.fn(), scheduleAspersoriumWaterVisualRemoval: vi.fn() }));

import { decodeAspersoriumContents, decodeTableContents, encodeAspersoriumContents, encodeTableContents } from "../../src/domain/block-state-layout";
import { ASPERSORIUM_BLOCK, ASPERSORIUM_COMPONENT, INVENTORY_VISUAL_COMPONENT, ROTATION_STATE, SACRISTAN_TABLE_BLOCK, SACRISTAN_TABLE_COMPONENT, TABLE_ROTATION_STATE } from "../../src/infrastructure/constants";
import { FakePermutation } from "../mocks/compact-runtime";

const components = new Map<string, BlockCustomComponent>();
const itemComponents = new Map<string, ItemCustomComponent>();
const parameters = { params: {} } as CustomComponentParameters;
beforeAll(async () => {
  await import("../../src/bootstrap/main");
  if (!engine.startup) throw new Error("Bootstrap did not subscribe to stable startup event");
  engine.startup({
    blockComponentRegistry: { registerCustomComponent: (id: string, component: BlockCustomComponent) => { components.set(id, component); } },
    itemComponentRegistry: { registerCustomComponent: (id: string, component: ItemCustomComponent) => { itemComponents.set(id, component); } },
  } as unknown as StartupEvent);
});
function place(componentId: string, typeId: string, states: Record<string, boolean | string | number>, yaw: number) {
  const event = {
    cancel: false,
    permutationToPlace: new FakePermutation(typeId, states).asPermutation(),
    player: { getRotation: () => ({ x: 0, y: yaw }) } as Player,
  } as BlockComponentPlayerPlaceBeforeEvent;
  const callback = components.get(componentId)?.beforeOnPlayerPlace;
  if (!callback) throw new Error(`Missing registered placement callback: ${componentId}`);
  callback(event, parameters);
  return event;
}

describe("registered compact block placement handlers", () => {
  it("preserves all 289 aspersorium contents and all 17 table contents in every placement rotation", () => {
    for (let rotation = 0; rotation < 16; rotation++) for (let occupancy = 0; occupancy < 17; occupancy++) {
      const cosmeticIndex = occupancy === 0 ? null : occupancy - 1;
      for (let waterUnits = 0; waterUnits <= 16; waterUnits++) {
        const contents = { waterUnits, cosmeticIndex };
        const initial = { ...encodeAspersoriumContents(contents), [ROTATION_STATE]: 0 };
        const event = place(ASPERSORIUM_COMPONENT, ASPERSORIUM_BLOCK, initial, rotation * 22.5);
        expect(event.cancel).toBe(false);
        expect(event.permutationToPlace.getAllStates()).toEqual({ ...initial, [ROTATION_STATE]: rotation });
        expect(decodeAspersoriumContents(event.permutationToPlace.getAllStates())).toEqual(contents);
      }
      const initial = { ...encodeTableContents({ cosmeticIndex }), [TABLE_ROTATION_STATE]: 0 };
      const event = place(SACRISTAN_TABLE_COMPONENT, SACRISTAN_TABLE_BLOCK, initial, rotation * 22.5);
      expect(event.cancel).toBe(false);
      expect(event.permutationToPlace.getAllStates()).toEqual({ ...initial, [TABLE_ROTATION_STATE]: rotation });
      expect(decodeTableContents(event.permutationToPlace.getAllStates())).toEqual({ cosmeticIndex });
    }
  });

  it.each(["legacy", "mixed", "missing", "padding", "invalid"] as const)("cancels %s layouts without replacing the original permutation", (kind) => {
    const aspersorium: Record<string, boolean | string | number> = { ...encodeAspersoriumContents({ waterUnits: 0, cosmeticIndex: null }), [ROTATION_STATE]: 3 };
    const table: Record<string, boolean | string | number> = { ...encodeTableContents({ cosmeticIndex: null }), [TABLE_ROTATION_STATE]: 7 };
    if (kind === "legacy") {
      Object.keys(aspersorium).forEach((key) => { if (key !== ROTATION_STATE) delete aspersorium[key]; });
      Object.keys(table).forEach((key) => { if (key !== TABLE_ROTATION_STATE) delete table[key]; });
      Object.assign(aspersorium, { "aspergillum:water_base": 9, "aspergillum:water_offset": 7, "aspergillum:has_aspergillum": true, "aspergillum:cosmetic": 15 });
      Object.assign(table, { "aspergillum:table_has_aspergillum": true, "aspergillum:table_cosmetic": 15 });
    }
    if (kind === "mixed") { aspersorium["aspergillum:has_aspergillum"] = false; table["aspergillum:table_cosmetic"] = 0; }
    if (kind === "missing") { delete aspersorium["aspergillum:contents_a"]; delete table["aspergillum:table_contents_a"]; }
    if (kind === "padding") {
      Object.assign(aspersorium, { "aspergillum:contents_a": 1, "aspergillum:contents_b": 0, "aspergillum:contents_c": 6, "aspergillum:contents_d": 6 });
      Object.assign(table, { "aspergillum:table_contents_a": 1, "aspergillum:table_contents_b": 8 });
    }
    if (kind === "invalid") { aspersorium["aspergillum:contents_b"] = 3; table["aspergillum:table_contents_b"] = 9; }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const a = place(ASPERSORIUM_COMPONENT, ASPERSORIUM_BLOCK, aspersorium, 180);
      const t = place(SACRISTAN_TABLE_COMPONENT, SACRISTAN_TABLE_BLOCK, table, 270);
      expect(a.cancel).toBe(true);
      expect(t.cancel).toBe(true);
      expect(a.permutationToPlace.getAllStates()).toEqual(aspersorium);
      expect(t.permutationToPlace.getAllStates()).toEqual(table);
    } finally { warn.mockRestore(); }
  });

  it("keeps the inventory visual proxy unplaceable", () => {
    const event = place(INVENTORY_VISUAL_COMPONENT, "aspergillum:inventory_visual", {}, 0);
    expect(event.cancel).toBe(true);
    expect(itemComponents.size).toBe(1);
  });
});
