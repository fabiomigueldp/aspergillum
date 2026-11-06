import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@minecraft/server", async () => import("../mocks/compact-runtime"));
vi.mock("../../src/presentation/animation-coordinator", () => ({ playLoadingAnimation: vi.fn() }));
vi.mock("../../src/presentation/audio/bedrock-audio-adapter", () => ({ audioPort: { emit: vi.fn() } }));
vi.mock("../../src/presentation/wet-feedback", () => ({ presentLoadedAspergillum: vi.fn() }));
vi.mock("../../src/presentation/customization-menu", () => ({ showCustomizationMenu: vi.fn() }));

import { handleAspersoriumBreak, handleAspersoriumInteraction } from "../../src/application/aspersorium";
import { clearCustomizationPlayerState, handleSacristanTableBreak, handleSacristanTableInteraction } from "../../src/application/sacristan-table";
import { encodeAspersoriumContents, encodeTableContents } from "../../src/domain/block-state-layout";
import { dockedEntryKey, dockedShardPropertyId } from "../../src/domain/docking";
import { ASPERSORIUM_BLOCK, ROTATION_STATE, SACRISTAN_TABLE_BLOCK, TABLE_ROTATION_STATE } from "../../src/infrastructure/constants";
import { getDockedSnapshot, setDockedSnapshot } from "../../src/infrastructure/docked-item-registry";
import { captureDockedAspergillum, createAspergillum } from "../../src/infrastructure/item-state";
import { showCustomizationMenu } from "../../src/presentation/customization-menu";
import { ACTION_MESSAGES } from "../../src/presentation/messaging";
import { advanceTicks, FakeBlock, FakeDimension, FakePermutation, FakePlayer, resetRuntime, world } from "../mocks/compact-runtime";

const players: string[] = [];
const kinds = ["aspersorium", "table"] as const;
function fixture(kind: typeof kinds[number]) {
  const dimension = new FakeDimension();
  const block = new FakeBlock(dimension, new FakePermutation(kind === "aspersorium" ? ASPERSORIUM_BLOCK : SACRISTAN_TABLE_BLOCK,
    kind === "aspersorium" ? { ...encodeAspersoriumContents({ waterUnits: 14, cosmeticIndex: 0 }), [ROTATION_STATE]: 7 }
      : { ...encodeTableContents({ cosmeticIndex: 0 }), [TABLE_ROTATION_STATE]: 7 }).asPermutation());
  const original = block.permutation;
  const player = new FakePlayer(dimension); players.push(player.id);
  const item = createAspergillum(3); item.nameTag = "Exact retained snapshot"; item.setDynamicProperty("test:note", "preserve");
  const snapshot = captureDockedAspergillum(item, 3);
  const property = dockedShardPropertyId(dimension.id, block.location);
  const interact = (sneaking = kind === "table") => {
    player.isSneaking = sneaking;
    (kind === "aspersorium" ? handleAspersoriumInteraction : handleSacristanTableInteraction)(player.interaction(block));
    advanceTicks();
  };
  const broken = block.breakEvent();
  const dispatchBreak = () => (kind === "aspersorium" ? handleAspersoriumBreak : handleSacristanTableBreak)(broken);
  const noDelivery = () => {
    expect(player.hand).toBeUndefined(); expect(player.inventory).toHaveLength(0); expect(dimension.drops).toHaveLength(0);
    expect(player.equipment.setEquipment).not.toHaveBeenCalled(); expect(player.container.addItem).not.toHaveBeenCalled();
    expect(dimension.spawnItem).not.toHaveBeenCalled(); expect(block.setPermutation).not.toHaveBeenCalled();
  };
  return { dimension, block, original, player, snapshot, property, interact, dispatchBreak, noDelivery };
}
beforeEach(() => { resetRuntime(); vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { for (const id of players.splice(0)) clearCustomizationPlayerState(id); advanceTicks(50); vi.restoreAllMocks(); });

describe("recovery never invents an item without an authoritative snapshot", () => {
  for (const kind of kinds) for (const storage of ["absent", "empty", "neighbor"] as const) {
    it(`refuses ${kind} undock with ${storage} storage before any write`, () => {
      const f = fixture(kind);
      const raw = storage === "absent" ? undefined : JSON.stringify({ schemaVersion: 1, entries: storage === "neighbor" ? { "3,64,-3": f.snapshot } : {} });
      world.setDynamicProperty(f.property, raw); world.setDynamicProperty.mockClear();
      f.interact(); advanceTicks(4); f.interact();
      f.noDelivery(); expect(f.block.permutation).toBe(f.original);
      expect(world.getDynamicProperty(f.property)).toBe(raw); expect(world.setDynamicProperty).not.toHaveBeenCalled();
      expect(f.player.onScreenDisplay.setActionBar).toHaveBeenCalledWith(expect.objectContaining({ translate: ACTION_MESSAGES.registryRecoveryRequired }));
    });
    it(`refuses ${kind} break recovery with ${storage} storage, including delayed replay`, () => {
      const f = fixture(kind);
      const raw = storage === "absent" ? undefined : JSON.stringify({ schemaVersion: 1, entries: storage === "neighbor" ? { "3,64,-3": f.snapshot } : {} });
      world.setDynamicProperty(f.property, raw); world.setDynamicProperty.mockClear();
      f.block.destroyForBreak(); f.dispatchBreak(); advanceTicks(10); f.dispatchBreak(); advanceTicks(10);
      f.noDelivery(); expect(world.getDynamicProperty(f.property)).toBe(raw); expect(world.setDynamicProperty).not.toHaveBeenCalled();
    });
  }
  it.each(kinds)("does not adopt a %s snapshot that appears after a refused dispatch", kind => {
    const f = fixture(kind); f.block.destroyForBreak(); f.dispatchBreak();
    setDockedSnapshot(f.dimension.id, f.block.location, f.snapshot); world.setDynamicProperty.mockClear();
    advanceTicks(100); f.noDelivery(); expect(getDockedSnapshot(f.dimension.id, f.block.location)).toEqual(f.snapshot);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
  it.each(kinds)("refuses a captured %s snapshot removed before the deferred callback", kind => {
    const f = fixture(kind); setDockedSnapshot(f.dimension.id, f.block.location, f.snapshot);
    f.block.destroyForBreak(); f.dispatchBreak();
    world.setDynamicProperty(f.property, undefined); world.setDynamicProperty.mockClear();
    advanceTicks(100); f.noDelivery(); expect(world.getDynamicProperty(f.property)).toBeUndefined();
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
  it.each(kinds)("does not fabricate a second %s item after a successful break consumed its snapshot", kind => {
    const f = fixture(kind); setDockedSnapshot(f.dimension.id, f.block.location, f.snapshot);
    f.block.destroyForBreak(); f.dispatchBreak(); advanceTicks();
    expect(f.dimension.drops).toHaveLength(1); expect(captureDockedAspergillum(f.dimension.drops[0]!.item, 3)).toEqual(f.snapshot);
    world.setDynamicProperty.mockClear(); advanceTicks(10); f.dispatchBreak(); advanceTicks(10);
    expect(f.dimension.drops).toHaveLength(1); expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
  for (const kind of kinds) for (const version of [1, 2] as const) {
    it(`retains real ${kind} zero-charge snapshot retrieval for supported V${version}`, () => {
      const f = fixture(kind); const expected = { ...f.snapshot, charges: 0 };
      const stored = version === 1 ? { ...expected, schemaVersion: 1 } : expected;
      world.setDynamicProperty(f.property, JSON.stringify({ schemaVersion: 1, entries: { [dockedEntryKey(f.block.location)]: stored } }));
      f.interact(); expect(captureDockedAspergillum(f.player.hand!, 0)).toEqual(expected);
      expect(getDockedSnapshot(f.dimension.id, f.block.location)).toBeUndefined(); expect(f.dimension.drops).toHaveLength(0);
    });
  }
  it("refuses a table form's retrieval if its snapshot disappears after opening", () => {
    const f = fixture("table"); setDockedSnapshot(f.dimension.id, f.block.location, f.snapshot); f.interact(false);
    const actions = vi.mocked(showCustomizationMenu).mock.calls.at(-1)![2];
    world.setDynamicProperty(f.property, undefined); world.setDynamicProperty.mockClear();
    expect(actions.finishAndRetrieve()).toBe(false); f.noDelivery(); expect(f.block.permutation).toBe(f.original);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
});
