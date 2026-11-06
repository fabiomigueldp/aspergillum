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
import { advanceTicks, failOnce, FakeBlock, FakeDimension, FakePermutation, FakePlayer, resetRuntime, world } from "../mocks/compact-runtime";

const players: string[] = [];
function fixture(kind: "aspersorium" | "table", occupied = true) {
  const dimension = new FakeDimension();
  const block = new FakeBlock(dimension, new FakePermutation(kind === "aspersorium" ? ASPERSORIUM_BLOCK : SACRISTAN_TABLE_BLOCK,
    kind === "aspersorium" ? { ...encodeAspersoriumContents({ waterUnits: 14, cosmeticIndex: occupied ? 0 : null }), [ROTATION_STATE]: 0 }
      : { ...encodeTableContents({ cosmeticIndex: occupied ? 0 : null }), [TABLE_ROTATION_STATE]: 0 }).asPermutation());
  const player = new FakePlayer(dimension);
  players.push(player.id);
  const saved = captureDockedAspergillum(createAspergillum(3), 3);
  if (occupied) setDockedSnapshot(dimension.id, block.location, saved);
  const interaction = () => {
    player.isSneaking = kind === "table" ? occupied : !occupied;
    (kind === "aspersorium" ? handleAspersoriumInteraction : handleSacristanTableInteraction)(player.interaction(block));
    advanceTicks();
  };
  const capturedBreak = block.breakEvent();
  const breakBlock = () => {
    block.permutation = new FakePermutation("minecraft:air", {}).asPermutation();
    (kind === "aspersorium" ? handleAspersoriumBreak : handleSacristanTableBreak)(capturedBreak);
  };
  return { block, dimension, player, saved, interaction, breakBlock };
}
beforeEach(() => {
  resetRuntime(); vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  for (const id of players.splice(0)) clearCustomizationPlayerState(id);
  advanceTicks(50); vi.restoreAllMocks();
});

describe("unrelated registry data through production handlers", () => {
  it.each(["aspersorium", "table"] as const)("docks %s normally while retaining an unsupported neighboring entry", (kind) => {
    const { block, dimension, player, interaction } = fixture(kind, false);
    const neighbor = { schemaVersion: 99, opaque: [1, 2, 3] };
    const property = dockedShardPropertyId(dimension.id, block.location);
    world.setDynamicProperty(property, JSON.stringify({ schemaVersion: 1, entries: { "3,64,-3": neighbor } }));
    player.hand = createAspergillum(3);
    const item = captureDockedAspergillum(player.hand, 3);
    interaction();
    expect(JSON.parse(world.getDynamicProperty(property) as string).entries["3,64,-3"]).toEqual(neighbor);
    expect(getDockedSnapshot(dimension.id, block.location)?.instanceId).toBe(item.instanceId);
    expect(player.hand).toBeUndefined();
    expect(block.setPermutation).toHaveBeenCalled();
  });

  for (const kind of ["aspersorium", "table"] as const) for (const operation of ["retrieve", "break"] as const) {
    it(`preserves unknown neighbor contents while ${operation} recovers the ${kind} item`, () => {
      const { block, dimension, player, saved, interaction, breakBlock } = fixture(kind);
      const neighbor = { arbitrary: "must survive" },property = dockedShardPropertyId(dimension.id, block.location);
      world.setDynamicProperty(property, JSON.stringify({ schemaVersion: 1, entries: { [dockedEntryKey(block.location)]: saved, "3,64,-3": neighbor } }));
      if(operation === "retrieve")interaction();else{breakBlock();advanceTicks(2);}
      expect(JSON.parse(world.getDynamicProperty(property) as string).entries).toEqual({"3,64,-3":neighbor});
      const restored=operation === "retrieve" ? player.hand : dimension.drops[0]?.item;
      expect(captureDockedAspergillum(restored!,3)).toEqual(saved);
      expect(dimension.drops).toHaveLength(operation === "retrieve" ? 0 : 1);
    });
  }
});

// These characterize unsafe existing outcomes. They do not approve release.
describe("unresolved errors after a native effect may already have happened", () => {
  it.each(["aspersorium", "table"] as const)("records duplicate %s delivery after spawn mutates then throws", (kind) => {
    const { block, dimension, saved, breakBlock } = fixture(kind);
    const spawn = dimension.spawnItem.getMockImplementation()!;
    dimension.spawnItem.mockImplementationOnce((item, location) => { spawn(item, location); return failOnce(); });
    breakBlock(); advanceTicks();
    expect(dimension.drops).toHaveLength(1);
    expect(getDockedSnapshot(dimension.id, block.location)).toEqual(saved);
    breakBlock(); advanceTicks();
    expect(dimension.drops).toHaveLength(2);
    expect(dimension.drops.map(({ item }) => captureDockedAspergillum(item, 3).instanceId)).toEqual([saved.instanceId, saved.instanceId]);
  });

  it.each(["aspersorium", "table"] as const)("records duplicate %s retrieval when equipment mutates then throws", (kind) => {
    const { block, dimension, player, saved, interaction } = fixture(kind);
    const set = player.equipment.setEquipment.getMockImplementation()!;
    player.equipment.setEquipment.mockImplementationOnce((slot, item) => { set(slot, item); return failOnce(); });
    interaction();
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(saved);
    expect(getDockedSnapshot(dimension.id, block.location)).toEqual(saved);
    player.inventory.push(player.hand!.clone()); // Receipt moved away before retry.
    player.hand = undefined;
    advanceTicks(3); interaction();
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(saved);
    expect(captureDockedAspergillum(player.inventory[0]!, 3)).toEqual(saved);
  });
});
