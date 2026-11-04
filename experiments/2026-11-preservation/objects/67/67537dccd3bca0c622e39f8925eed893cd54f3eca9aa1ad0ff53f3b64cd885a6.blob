import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@minecraft/server", async () => import("../mocks/compact-runtime"));
vi.mock("../../src/presentation/customization-menu", () => ({ showCustomizationMenu: vi.fn() }));

import { clearCustomizationPlayerState, handleSacristanTableBreak, handleSacristanTableInteraction, handleSacristanTableUseOn } from "../../src/application/sacristan-table";
import { decodeTableContents, encodeTableContents } from "../../src/domain/block-state-layout";
import { ASPERGILLUM_COSMETICS } from "../../src/domain/customization";
import { withTableOccupancy } from "../../src/infrastructure/compact-block-state";
import { INSTANCE_ID_PROPERTY, SACRISTAN_TABLE_BLOCK, TABLE_ROTATION_STATE } from "../../src/infrastructure/constants";
import { deleteDockedSnapshot, getDockedSnapshot, setDockedSnapshot } from "../../src/infrastructure/docked-item-registry";
import { captureDockedAspergillum, createAspergillum, readAspergillumState, writeAspergillumState } from "../../src/infrastructure/item-state";
import { showCustomizationMenu } from "../../src/presentation/customization-menu";
import { advanceTicks, failOnce, FakeBlock, FakeDimension, FakePermutation, FakePlayer, ItemStack, missEquipmentAfterNextRegistryWrite, resetRuntime, world } from "../mocks/compact-runtime";

const players: string[] = [];
function fixture(cosmeticIndex: number | null = null, rotation = 0) {
  const dimension = new FakeDimension();
  const block = new FakeBlock(dimension, new FakePermutation(SACRISTAN_TABLE_BLOCK, {
    ...encodeTableContents({ cosmeticIndex }), [TABLE_ROTATION_STATE]: rotation,
  }).asPermutation());
  const player = new FakePlayer(dimension);
  players.push(player.id);
  return { dimension, block, player };
}
function state(block: FakeBlock) { return decodeTableContents(block.permutation.getAllStates()); }
function item(cosmeticIndex = 0) {
  const original = createAspergillum(3);
  const result = writeAspergillumState(original, { ...readAspergillumState(original), cosmeticId: ASPERGILLUM_COSMETICS[cosmeticIndex]!.id, sprayProfileId: "contained" });
  result.nameTag = "Named table item";
  result.setDynamicProperty("fixture:note", "preserve table metadata");
  result.setDynamicProperty("fixture:vector", { x: 7, y: 8, z: 9 });
  return result;
}
function interact(player: FakePlayer, block: FakeBlock, sneaking = false) {
  player.isSneaking = sneaking;
  handleSacristanTableInteraction(player.interaction(block));
  advanceTicks();
}
function snapshot(block: FakeBlock) { return getDockedSnapshot(block.dimension.id, block.location); }
function menu() {
  const call = vi.mocked(showCustomizationMenu).mock.calls.at(-1);
  if (!call) throw new Error("Expected real application to open the presentation port");
  return call[2];
}
function dock(cosmeticIndex = 0, rotation = 0) {
  const f = fixture(null, rotation);
  f.player.hand = item(cosmeticIndex);
  interact(f.player, f.block);
  return { ...f, actions: menu(), saved: snapshot(f.block)! };
}

beforeEach(() => { resetRuntime(); vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => {
  for (const id of players.splice(0)) clearCustomizationPlayerState(id);
  advanceTicks(50);
  vi.restoreAllMocks();
});

describe("real sacristan table application with compact block states", () => {
  it("docks, recolors and retrieves every finish at all sixteen rotations with exact metadata", () => {
    for (let rotation = 0; rotation < 16; rotation++) for (const cosmetic of ASPERGILLUM_COSMETICS) {
      const { player, block, dimension } = fixture(null, rotation);
      player.hand = item(cosmetic.index);
      const expected = captureDockedAspergillum(player.hand, 3);
      handleSacristanTableInteraction(player.interaction(block));
      handleSacristanTableUseOn(player.asPlayer(), block.asBlock(), false);
      advanceTicks();
      expect(player.hand).toBeUndefined();
      expect(snapshot(block)).toEqual(expected);
      expect(state(block)).toEqual({ cosmeticIndex: cosmetic.index });
      expect(block.setPermutation).toHaveBeenCalledTimes(1);
      const actions = menu();
      const next = ASPERGILLUM_COSMETICS[(cosmetic.index + rotation + 1) % 16]!;
      expect(actions.applyCosmetic(next.id)).toBe(true);
      expect(snapshot(block)).toEqual({ ...expected, cosmeticId: next.id });
      expect(state(block)).toEqual({ cosmeticIndex: next.index });
      expect(block.permutation.getAllStates()[TABLE_ROTATION_STATE]).toBe(rotation);
      expect(actions.finishAndRetrieve()).toBe(true);
      expect(actions.finishAndRetrieve()).toBe(false);
      expect(state(block)).toEqual({ cosmeticIndex: null });
      expect(block.permutation.getAllStates()[TABLE_ROTATION_STATE]).toBe(rotation);
      expect(captureDockedAspergillum(player.hand!, 3)).toEqual({ ...expected, cosmeticId: next.id });
      expect(snapshot(block)).toBeUndefined();
      expect(dimension.drops).toHaveLength(0);
      expect(player.inventory).toHaveLength(0);
    }
  });

  it("updates profiles without changing appearance and restores classic without changing stored identity or charges", () => {
    const { actions, block, saved } = dock(15, 15);
    const previous = block.permutation.getAllStates();
    expect(actions.applySprayProfile("processional")).toBe(true);
    expect(block.permutation.getAllStates()).toEqual(previous);
    expect(snapshot(block)).toEqual({ ...saved, sprayProfileId: "processional" });
    expect(actions.restoreClassic()).toBe(true);
    expect(state(block)).toEqual({ cosmeticIndex: 0 });
    expect(snapshot(block)).toEqual({ ...saved, cosmeticId: "classic", sprayProfileId: "standard" });
    expect(block.permutation.getAllStates()[TABLE_ROTATION_STATE]).toBe(15);
  });

  it("close invalidates old callbacks while keeping the item and latest appearance on the table", () => {
    const { player, block, actions, saved } = dock(15, 7);
    expect(actions.applyCosmetic("antique_black")).toBe(true);
    actions.close();
    const expected = { ...saved, cosmeticId: "antique_black" };
    expect(actions.applyCosmetic("classic")).toBe(false);
    expect(actions.finishAndRetrieve()).toBe(false);
    expect(snapshot(block)).toEqual(expected);
    expect(player.hand).toBeUndefined();
    advanceTicks(3);
    interact(player, block, true);
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(expected);
    expect(snapshot(block)).toBeUndefined();
  });

  it.each(["occupancy", "dimension", "distance", "invalid_player", "invalid_block", "snapshot", "type", "reserved"] as const)("refuses stale customization when %s changes", (change) => {
    const { player, block, actions, dimension } = dock(9, 8);
    if (change === "occupancy") block.permutation = withTableOccupancy(block.permutation, null);
    if (change === "dimension") player.dimension = new FakeDimension();
    if (change === "distance") player.location.z += 20;
    if (change === "invalid_player") player.isValid = false;
    if (change === "invalid_block") block.isValid = false;
    if (change === "snapshot") deleteDockedSnapshot(dimension.id, block.location);
    if (change === "type") block.permutation = new FakePermutation("minecraft:stone", block.permutation.getAllStates()).asPermutation();
    if (change === "reserved") block.permutation = new FakePermutation(SACRISTAN_TABLE_BLOCK, { "aspergillum:table_contents_a": 1, "aspergillum:table_contents_b": 8, [TABLE_ROTATION_STATE]: 8 }).asPermutation();
    const before = block.permutation.getAllStates();
    const saved = snapshot(block);
    const writes = block.setPermutation.mock.calls.length;
    expect(actions.applyCosmetic("bronze_ivory")).toBe(false);
    expect(actions.applySprayProfile("standard")).toBe(false);
    expect(actions.restoreClassic()).toBe(false);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(snapshot(block)).toEqual(saved);
    expect(block.setPermutation).toHaveBeenCalledTimes(writes);
    expect(player.hand).toBeUndefined();
  });

  it.each(["dimension", "distance", "invalid_player", "invalid_block", "type", "occupancy", "reserved"] as const)("refuses finish-and-retrieve after %s changes", (change) => {
    const { player, block, actions, dimension, saved } = dock(15, 14);
    if (change === "dimension") player.dimension = new FakeDimension();
    if (change === "distance") player.location.x += 20;
    if (change === "invalid_player") player.isValid = false;
    if (change === "invalid_block") block.isValid = false;
    if (change === "type") block.permutation = new FakePermutation("minecraft:stone", block.permutation.getAllStates()).asPermutation();
    if (change === "occupancy") block.permutation = withTableOccupancy(block.permutation, null);
    if (change === "reserved") block.permutation = new FakePermutation(SACRISTAN_TABLE_BLOCK, { "aspergillum:table_contents_a": 1, "aspergillum:table_contents_b": 8, [TABLE_ROTATION_STATE]: 14 }).asPermutation();
    const before = block.permutation.getAllStates();
    const writes = block.setPermutation.mock.calls.length;
    expect(actions.finishAndRetrieve()).toBe(false);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(block.setPermutation).toHaveBeenCalledTimes(writes);
    expect(snapshot(block)).toEqual(saved);
    expect(player.hand).toBeUndefined();
    expect(dimension.drops).toHaveLength(0);
  });

  it.each(["registry", "block"] as const)("rolls back recoloring after %s write failure", (failure) => {
    const { block, actions, saved } = dock(0, 13);
    const before = block.permutation.getAllStates();
    if (failure === "registry") world.setDynamicProperty.mockImplementationOnce(failOnce);
    else block.setPermutation.mockImplementationOnce(failOnce);
    expect(actions.applyCosmetic("bronze_ivory")).toBe(false);
    expect(snapshot(block)).toEqual(saved);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(actions.applyCosmetic("bronze_ivory")).toBe(true);
    expect(state(block)).toEqual({ cosmeticIndex: 15 });
    expect(snapshot(block)).toEqual({ ...saved, cosmeticId: "bronze_ivory" });
  });

  it.each(["registry", "hand", "block", "hand_rejected", "hand_missing"] as const)("restores all table docking writes after %s failure", (failure) => {
    const { player, block, dimension } = fixture(null, 15);
    player.hand = item(15);
    const expected = captureDockedAspergillum(player.hand, 3);
    const before = block.permutation.getAllStates();
    if (failure === "registry") world.setDynamicProperty.mockImplementationOnce(failOnce);
    if (failure === "hand") player.equipment.setEquipment.mockImplementationOnce(failOnce);
    if (failure === "block") block.setPermutation.mockImplementationOnce(failOnce);
    if (failure === "hand_rejected") player.equipment.setEquipment.mockReturnValueOnce(false);
    if (failure === "hand_missing") missEquipmentAfterNextRegistryWrite(player);
    interact(player, block);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(expected);
    expect(snapshot(block)).toBeUndefined();
    expect(showCustomizationMenu).not.toHaveBeenCalled();
    expect(dimension.drops).toHaveLength(0);
  });

  it.each(["registry", "hand", "block", "hand_rejected", "hand_missing"] as const)("restores snapshot and occupancy on retrieval %s failure and permits one later retry", (failure) => {
    const { player, block, actions, dimension, saved } = dock(15, 4);
    const before = block.permutation.getAllStates();
    if (failure === "registry") world.setDynamicProperty.mockImplementationOnce(failOnce);
    if (failure === "hand") player.equipment.setEquipment.mockImplementationOnce(failOnce);
    if (failure === "block") block.setPermutation.mockImplementationOnce(failOnce);
    if (failure === "hand_rejected") player.equipment.setEquipment.mockReturnValueOnce(false);
    if (failure === "hand_missing") missEquipmentAfterNextRegistryWrite(player, 1);
    expect(actions.finishAndRetrieve()).toBe(false);
    expect(player.hand).toBeUndefined();
    expect(snapshot(block)).toEqual(saved);
    expect(block.permutation.getAllStates()).toEqual(before);
    advanceTicks(3);
    interact(player, block, true);
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(saved);
    expect(snapshot(block)).toBeUndefined();
    expect(state(block)).toEqual({ cosmeticIndex: null });
    expect(dimension.drops).toHaveLength(0);
  });

  it("retrieves into inventory or ground exactly once when the hand is occupied", () => {
    for (const full of [false, true]) {
      const { player, block, actions, dimension, saved } = dock(10);
      player.hand = new ItemStack("minecraft:stone").asItem();
      if (full) player.container.addItem.mockImplementationOnce((value) => value);
      expect(actions.finishAndRetrieve()).toBe(true);
      expect(player.hand.typeId).toBe("minecraft:stone");
      const recovered = full ? dimension.drops[0]!.item : player.inventory[0]!;
      expect(captureDockedAspergillum(recovered, 3)).toEqual(saved);
      expect(dimension.drops).toHaveLength(full ? 1 : 0);
      expect(player.inventory).toHaveLength(full ? 0 : 1);
      expect(snapshot(block)).toBeUndefined();
      expect(actions.finishAndRetrieve()).toBe(false);
    }
  });

  it("break invalidates menu callbacks and recovers one preserved item for duplicate dispatch", () => {
    const { player, block, actions, dimension, saved } = dock(15, 6);
    const broken = block.destroyForBreak();
    handleSacristanTableBreak(broken);
    handleSacristanTableBreak(broken);
    expect(actions.applyCosmetic("classic")).toBe(false);
    expect(actions.finishAndRetrieve()).toBe(false);
    advanceTicks(2);
    expect(player.hand).toBeUndefined();
    expect(dimension.drops).toHaveLength(1);
    expect(captureDockedAspergillum(dimension.drops[0]!.item, 3)).toEqual(saved);
    expect(snapshot(block)).toBeUndefined();
  });

  it.each(["delete", "spawn"] as const)("documents the existing non-atomic table break %s failure", (failure) => {
    const { block, dimension, saved } = dock(8, 11);
    if (failure === "delete") world.setDynamicProperty.mockImplementationOnce(failOnce);
    else dimension.spawnItem.mockImplementationOnce(failOnce);
    handleSacristanTableBreak(block.destroyForBreak());
    advanceTicks(2);
    expect(dimension.drops).toHaveLength(failure === "delete" ? 1 : 0);
    expect(snapshot(block)).toEqual(saved);
    if (failure === "delete") {
      // Known non-atomic result: a delivered item and snapshot coexist. Do not
      // equate this with safe retry or an exactly-once recovery guarantee.
      expect(captureDockedAspergillum(dimension.drops[0]!.item, 3)).toEqual(saved);
    }
  });

  it("preserves a replacement table snapshot when it changes before deferred break recovery", () => {
    const { block, dimension } = dock(15);
    const replacement = captureDockedAspergillum(item(0), 3);
    handleSacristanTableBreak(block.destroyForBreak());
    setDockedSnapshot(dimension.id, block.location, replacement);
    advanceTicks();
    expect(dimension.drops).toHaveLength(0);
    expect(snapshot(block)).toEqual(replacement);
  });

  it("recovers a new table item broken at the same location on the next tick", () => {
    const { block, dimension, saved } = dock(15);
    const replacement = captureDockedAspergillum(item(0), 3);
    const occupiedPermutation = block.permutation;
    handleSacristanTableBreak(block.destroyForBreak());
    advanceTicks();
    block.permutation = occupiedPermutation; // A real new occupancy before the second destruction.
    setDockedSnapshot(dimension.id, block.location, replacement);
    handleSacristanTableBreak(block.destroyForBreak());
    advanceTicks();
    expect(dimension.drops).toHaveLength(2);
    expect(captureDockedAspergillum(dimension.drops[0]!.item, 3)).toEqual(saved);
    expect(captureDockedAspergillum(dimension.drops[1]!.item, 3)).toEqual(replacement);
    expect(snapshot(block)).toBeUndefined();
  });

  it.each(["mixed", "missing", "padding", "invalid", "legacy"] as const)("rejects %s table contents at interaction and break boundaries", (kind) => {
    const { player, block, dimension } = fixture(15, 6);
    const saved = captureDockedAspergillum(item(15), 3);
    setDockedSnapshot(dimension.id, block.location, saved);
    const states = block.permutation.getAllStates();
    if (kind === "mixed") states["aspergillum:table_has_aspergillum"] = true;
    if (kind === "missing") delete states["aspergillum:table_contents_a"];
    if (kind === "padding") Object.assign(states, { "aspergillum:table_contents_a": 1, "aspergillum:table_contents_b": 8 });
    if (kind === "invalid") states["aspergillum:table_contents_b"] = 9;
    if (kind === "legacy") {
      Object.keys(states).forEach((key) => { if (key !== TABLE_ROTATION_STATE) delete states[key]; });
      Object.assign(states, { "aspergillum:table_has_aspergillum": true, "aspergillum:table_cosmetic": 15 });
    }
    block.permutation = new FakePermutation(SACRISTAN_TABLE_BLOCK, states).asPermutation();
    const writes = world.setDynamicProperty.mock.calls.length;
    expect(() => interact(player, block, true)).not.toThrow();
    expect(() => handleSacristanTableBreak(block.breakEvent())).not.toThrow();
    advanceTicks(20);
    expect(block.permutation.getAllStates()).toEqual(states);
    expect(block.setPermutation).not.toHaveBeenCalled();
    expect(world.setDynamicProperty).toHaveBeenCalledTimes(writes);
    expect(snapshot(block)).toEqual(saved);
    expect(player.hand).toBeUndefined();
    expect(showCustomizationMenu).not.toHaveBeenCalled();
    expect(dimension.drops).toHaveLength(0);
  });

  it("refuses an orphaned stored item instead of overwriting it", () => {
    const { player, block, dimension } = fixture();
    const orphan = captureDockedAspergillum(item(15), 3);
    setDockedSnapshot(dimension.id, block.location, orphan);
    player.hand = item(0);
    const identity = player.hand.getDynamicProperty(INSTANCE_ID_PROPERTY);
    interact(player, block);
    expect(snapshot(block)).toEqual(orphan);
    expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(identity);
    expect(block.setPermutation).not.toHaveBeenCalled();
    expect(showCustomizationMenu).not.toHaveBeenCalled();
  });
});
