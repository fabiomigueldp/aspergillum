import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@minecraft/server", async () => import("../mocks/compact-runtime"));
vi.mock("../../src/presentation/animation-coordinator", () => ({ playLoadingAnimation: vi.fn() }));
vi.mock("../../src/presentation/audio/bedrock-audio-adapter", () => ({ audioPort: { emit: vi.fn() } }));
vi.mock("../../src/presentation/wet-feedback", () => ({ presentLoadedAspergillum: vi.fn() }));

import { handleAspergillumUseOn, handleAspersoriumBreak, handleAspersoriumInteraction } from "../../src/application/aspersorium";
import { decodeAspersoriumContents, encodeAspersoriumContents } from "../../src/domain/block-state-layout";
import { ASPERGILLUM_COSMETICS } from "../../src/domain/customization";
import { getActionLease } from "../../src/infrastructure/action-lease";
import { withAspersoriumOccupancy } from "../../src/infrastructure/compact-block-state";
import { ASPERSORIUM_BLOCK, INSTANCE_ID_PROPERTY, ROTATION_STATE } from "../../src/infrastructure/constants";
import { getDockedSnapshot, setDockedSnapshot } from "../../src/infrastructure/docked-item-registry";
import { captureDockedAspergillum, createAspergillum, readAspergillumState, writeAspergillumState } from "../../src/infrastructure/item-state";
import { cancelLoadingSession, getLoadingBlockOwner, getLoadingSession } from "../../src/infrastructure/loading-session";
import { audioPort } from "../../src/presentation/audio/bedrock-audio-adapter";
import { presentLoadedAspergillum } from "../../src/presentation/wet-feedback";
import { advanceTicks, failOnce, FakeBlock, FakeDimension, FakePermutation, FakePlayer, GameMode, ItemStack, missEquipmentAfterNextRegistryWrite, resetRuntime, world } from "../mocks/compact-runtime";

function fixture(water = 0, cosmeticIndex: number | null = null, rotation = 0) {
  const dimension = new FakeDimension();
  const block = new FakeBlock(dimension, new FakePermutation(ASPERSORIUM_BLOCK, {
    ...encodeAspersoriumContents({ waterUnits: water, cosmeticIndex }), [ROTATION_STATE]: rotation,
  }).asPermutation());
  return { dimension, block, player: new FakePlayer(dimension) };
}
function state(block: FakeBlock) { return decodeAspersoriumContents(block.permutation.getAllStates()); }
function item(charges = 4, cosmeticIndex = 0) {
  const original = createAspergillum(charges);
  const result = writeAspergillumState(original, { ...readAspergillumState(original), cosmeticId: ASPERGILLUM_COSMETICS[cosmeticIndex]!.id, sprayProfileId: "contained" });
  result.nameTag = "Preserved named aspergillum";
  result.setDynamicProperty("fixture:note", "keep me");
  result.setDynamicProperty("fixture:vector", { x: 1, y: 2, z: 3 });
  return result;
}
function interact(player: FakePlayer, block: FakeBlock, sneaking = false) {
  player.isSneaking = sneaking;
  handleAspersoriumInteraction(player.interaction(block));
  advanceTicks();
}
function snapshot(block: FakeBlock) { return getDockedSnapshot(block.dimension.id, block.location); }

beforeEach(() => { resetRuntime(); vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { advanceTicks(50); vi.restoreAllMocks(); });

describe("real aspersorium application with compact block states", () => {
  it("fills all 17 occupancy values in every rotation without changing the stored item", () => {
    for (let rotation = 0; rotation < 16; rotation++) {
      for (let occupancy = 0; occupancy <= 16; occupancy++) {
        const cosmeticIndex = occupancy === 0 ? null : occupancy - 1;
        const { player, block } = fixture(1, cosmeticIndex, rotation);
        if (cosmeticIndex !== null) setDockedSnapshot(block.dimension.id, block.location, captureDockedAspergillum(item(3, cosmeticIndex), 3));
        const saved = snapshot(block);
        player.hand = new ItemStack("minecraft:water_bucket").asItem();
        interact(player, block);
        expect(state(block)).toEqual({ waterUnits: 16, cosmeticIndex });
        expect(block.permutation.getAllStates()[ROTATION_STATE]).toBe(rotation);
        expect(player.hand?.typeId).toBe("minecraft:bucket");
        expect(snapshot(block)).toEqual(saved);
        expect(block.setPermutation).toHaveBeenCalledTimes(1);
      }
    }
  });

  it("docks and retrieves all finishes in all rotations, conserving partial water and exact metadata", () => {
    for (let rotation = 0; rotation < 16; rotation++) for (const cosmetic of ASPERGILLUM_COSMETICS) {
      const { player, block, dimension } = fixture(14, null, rotation);
      const original = item(4, cosmetic.index);
      const expected = captureDockedAspergillum(original, 2);
      player.hand = original;
      // Both engine routes report the same gesture; intent is captured before deferral.
      player.isSneaking = true;
      handleAspersoriumInteraction(player.interaction(block));
      handleAspergillumUseOn(player.asPlayer(), block.asBlock(), true);
      player.isSneaking = false;
      advanceTicks();
      expect(player.hand).toBeUndefined();
      expect(state(block)).toEqual({ waterUnits: 16, cosmeticIndex: cosmetic.index });
      expect(snapshot(block)).toEqual(expected);
      expect(block.setPermutation).toHaveBeenCalledTimes(1);
      advanceTicks(3);
      interact(player, block);
      expect(state(block)).toEqual({ waterUnits: 16, cosmeticIndex: null });
      expect(block.permutation.getAllStates()[ROTATION_STATE]).toBe(rotation);
      expect(captureDockedAspergillum(player.hand!, 2)).toEqual(expected);
      expect(snapshot(block)).toBeUndefined();
      expect(dimension.drops).toHaveLength(0);
      expect(player.inventory).toHaveLength(0);
      handleAspergillumUseOn(player.asPlayer(), block.asBlock(), false); // Duplicate event for the retrieval gesture.
      advanceTicks();
      expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(expected.instanceId);
      expect(dimension.drops).toHaveLength(0);
    }
  });

  it("loads at tick 10 once, retains rotation, and releases real session and action leases", () => {
    const { player, block } = fixture(7, null, 15);
    player.hand = item(1, 15);
    const originalId = player.hand.getDynamicProperty(INSTANCE_ID_PROPERTY);
    interact(player, block);
    expect(getLoadingSession(player.id)).toBeDefined();
    advanceTicks(9);
    expect(state(block).waterUnits).toBe(7);
    expect(readAspergillumState(player.hand!).charges).toBe(1);
    advanceTicks();
    expect(state(block)).toEqual({ waterUnits: 4, cosmeticIndex: null });
    expect(readAspergillumState(player.hand!)).toMatchObject({ charges: 4, cosmeticId: "bronze_ivory", sprayProfileId: "contained" });
    expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(originalId);
    expect(block.permutation.getAllStates()[ROTATION_STATE]).toBe(15);
    expect(presentLoadedAspergillum).toHaveBeenCalledTimes(1);
    advanceTicks(10);
    expect(block.setPermutation).toHaveBeenCalledTimes(1);
    expect(getLoadingSession(player.id)).toBeUndefined();
    expect(getActionLease(player.id)).toBeUndefined();
    expect(getLoadingBlockOwner(block.dimension.id, block.location)).toBeUndefined();
  });

  it.each(["occupied", "water", "slot", "identity", "dimension", "distance", "spectator", "cancel"] as const)("cancels loading when %s changes before commit without losing resources", (change) => {
    const { player, block } = fixture(9, null, 12);
    player.hand = item(0, 8);
    interact(player, block);
    if (change === "occupied") block.permutation = withAspersoriumOccupancy(block.permutation, 15);
    if (change === "water") block.permutation = new FakePermutation(ASPERSORIUM_BLOCK, { ...encodeAspersoriumContents({ waterUnits: 8, cosmeticIndex: null }), [ROTATION_STATE]: 12 }).asPermutation();
    if (change === "slot") player.selectedSlotIndex++;
    if (change === "identity") player.hand = item(0, 8);
    if (change === "dimension") player.dimension = new FakeDimension();
    if (change === "distance") player.location.x += 20;
    if (change === "spectator") player.mode = GameMode.Spectator;
    if (change === "cancel") cancelLoadingSession(player.id);
    const before = block.permutation.getAllStates();
    advanceTicks(20);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(block.setPermutation).not.toHaveBeenCalled();
    expect(readAspergillumState(player.hand!).charges).toBe(0);
    expect(presentLoadedAspergillum).not.toHaveBeenCalled();
    expect(getLoadingSession(player.id)).toBeUndefined();
    expect(getActionLease(player.id)).toBeUndefined();
  });

  it.each(["mixed", "missing", "padding", "invalid", "legacy"] as const)("rejects %s contents at interaction and break boundaries without writes or fabricated items", (kind) => {
    const { player, block, dimension } = fixture(16, 15, 9);
    const saved = captureDockedAspergillum(item(3, 15), 3);
    setDockedSnapshot(dimension.id, block.location, saved);
    const states = block.permutation.getAllStates();
    if (kind === "mixed") states["aspergillum:has_aspergillum"] = true;
    if (kind === "missing") delete states["aspergillum:contents_a"];
    if (kind === "padding") Object.assign(states, { "aspergillum:contents_a": 1, "aspergillum:contents_b": 0, "aspergillum:contents_c": 6, "aspergillum:contents_d": 6 });
    if (kind === "invalid") states["aspergillum:contents_b"] = 3;
    if (kind === "legacy") {
      Object.keys(states).forEach((key) => { if (key !== ROTATION_STATE) delete states[key]; });
      Object.assign(states, { "aspergillum:water_base": 9, "aspergillum:water_offset": 7, "aspergillum:has_aspergillum": true, "aspergillum:cosmetic": 15 });
    }
    block.permutation = new FakePermutation(ASPERSORIUM_BLOCK, states).asPermutation();
    player.hand = new ItemStack("minecraft:water_bucket").asItem();
    const writes = world.setDynamicProperty.mock.calls.length;
    expect(() => interact(player, block)).not.toThrow();
    expect(() => handleAspersoriumBreak(block.breakEvent())).not.toThrow();
    advanceTicks(20);
    expect(block.permutation.getAllStates()).toEqual(states);
    expect(block.setPermutation).not.toHaveBeenCalled();
    expect(world.setDynamicProperty).toHaveBeenCalledTimes(writes);
    expect(snapshot(block)).toEqual(saved);
    expect(player.hand?.typeId).toBe("minecraft:water_bucket");
    expect(dimension.drops).toHaveLength(0);
  });

  it("rejects a layout that becomes incompatible during loading and releases the lease", () => {
    const { player, block } = fixture(16);
    player.hand = item(0);
    interact(player, block);
    const states = { ...block.permutation.getAllStates(), "aspergillum:water_base": 0 };
    block.permutation = new FakePermutation(ASPERSORIUM_BLOCK, states).asPermutation();
    expect(() => advanceTicks(20)).not.toThrow();
    expect(readAspergillumState(player.hand!).charges).toBe(0);
    expect(block.permutation.getAllStates()).toEqual(states);
    expect(block.setPermutation).not.toHaveBeenCalled();
    expect(getLoadingSession(player.id)).toBeUndefined();
    expect(getActionLease(player.id)).toBeUndefined();
  });

  it("preserves water during Creative loading and keeps the Creative bucket", () => {
    const { player, block } = fixture(3);
    player.mode = GameMode.Creative;
    player.hand = item(1);
    interact(player, block);
    advanceTicks(17);
    expect(readAspergillumState(player.hand!).charges).toBe(4);
    expect(state(block).waterUnits).toBe(3);
    player.hand = new ItemStack("minecraft:water_bucket").asItem();
    interact(player, block);
    expect(state(block).waterUnits).toBe(16);
    expect(player.hand.typeId).toBe("minecraft:water_bucket");
  });

  it.each(["fill", "load", "dock"] as const)("rolls back item and all compact digits on %s block write failure", (operation) => {
    const { player, block } = fixture(9, null, 11);
    player.hand = operation === "fill" ? new ItemStack("minecraft:water_bucket").asItem() : item(operation === "load" ? 0 : 4, 14);
    const beforeItem = player.hand.clone();
    const beforeStates = block.permutation.getAllStates();
    block.setPermutation.mockImplementationOnce(failOnce);
    interact(player, block, operation === "dock");
    advanceTicks(20);
    expect(block.permutation.getAllStates()).toEqual(beforeStates);
    expect(player.hand?.typeId).toBe(beforeItem.typeId);
    expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(beforeItem.getDynamicProperty(INSTANCE_ID_PROPERTY));
    if (operation !== "fill") expect(readAspergillumState(player.hand!)).toEqual(readAspergillumState(beforeItem));
    expect(snapshot(block)).toBeUndefined();
    expect(audioPort.emit).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: `${operation === "load" ? "load" : operation === "dock" ? "dock" : "aspersorium"}.${operation === "fill" ? "fill" : "commit"}` }));
  });

  it.each(["fill", "load"] as const)("rolls back %s when equipment returns false instead of throwing", (operation) => {
    const { player, block } = fixture(9, null, 11);
    player.hand = operation === "fill" ? new ItemStack("minecraft:water_bucket").asItem() : item(0, 15);
    const before = block.permutation.getAllStates();
    const original = player.hand.clone();
    player.equipment.setEquipment.mockReturnValueOnce(false);
    interact(player, block);
    advanceTicks(20);
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(player.hand?.typeId).toBe(original.typeId);
    expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(original.getDynamicProperty(INSTANCE_ID_PROPERTY));
    if (operation === "load") expect(readAspergillumState(player.hand!).charges).toBe(0);
    expect(getLoadingSession(player.id)).toBeUndefined();
    expect(getActionLease(player.id)).toBeUndefined();
    expect(presentLoadedAspergillum).not.toHaveBeenCalled();
  });

  it.each(["registry", "hand", "hand_rejected", "hand_missing"] as const)("restores a dock attempt after %s failure without a second item", (failure) => {
    const { player, block, dimension } = fixture(14, null, 6);
    player.hand = item(4, 15);
    const expected = captureDockedAspergillum(player.hand, 4);
    const original = block.permutation.getAllStates();
    if (failure === "registry") world.setDynamicProperty.mockImplementationOnce(failOnce);
    if (failure === "hand") player.equipment.setEquipment.mockImplementationOnce(failOnce);
    if (failure === "hand_rejected") player.equipment.setEquipment.mockReturnValueOnce(false);
    if (failure === "hand_missing") missEquipmentAfterNextRegistryWrite(player);
    interact(player, block, true);
    expect(block.permutation.getAllStates()).toEqual(original);
    expect(captureDockedAspergillum(player.hand!, 4)).toEqual(expected);
    expect(snapshot(block)).toBeUndefined();
    expect(dimension.drops).toHaveLength(0);
  });

  it.each(["block", "registry", "delivery", "delivery_rejected", "delivery_missing"] as const)("restores occupancy and snapshot after failed %s during undocking, then retrieves exactly once", (failure) => {
    const { player, block, dimension } = fixture(12, 15, 9);
    const expected = captureDockedAspergillum(item(3, 15), 3);
    setDockedSnapshot(dimension.id, block.location, expected);
    const before = block.permutation.getAllStates();
    if (failure === "block") block.setPermutation.mockImplementationOnce(failOnce);
    if (failure === "registry") world.setDynamicProperty.mockImplementationOnce(failOnce);
    if (failure === "delivery") player.equipment.setEquipment.mockImplementationOnce(failOnce);
    if (failure === "delivery_rejected") player.equipment.setEquipment.mockReturnValueOnce(false);
    if (failure === "delivery_missing") missEquipmentAfterNextRegistryWrite(player, 1);
    interact(player, block);
    expect(player.hand).toBeUndefined();
    expect(block.permutation.getAllStates()).toEqual(before);
    expect(snapshot(block)).toEqual(expected);
    advanceTicks(3);
    interact(player, block);
    expect(captureDockedAspergillum(player.hand!, 3)).toEqual(expected);
    expect(snapshot(block)).toBeUndefined();
    expect(state(block)).toEqual({ waterUnits: 12, cosmeticIndex: null });
    expect(dimension.drops).toHaveLength(0);
  });

  it("refuses an orphaned snapshot instead of overwriting its item", () => {
    const { player, block, dimension } = fixture(1);
    const orphan = captureDockedAspergillum(item(2, 15), 2);
    setDockedSnapshot(dimension.id, block.location, orphan);
    player.hand = item(4, 0);
    const id = player.hand.getDynamicProperty(INSTANCE_ID_PROPERTY);
    interact(player, block, true);
    expect(snapshot(block)).toEqual(orphan);
    expect(player.hand?.getDynamicProperty(INSTANCE_ID_PROPERTY)).toBe(id);
    expect(block.setPermutation).not.toHaveBeenCalled();
  });

  it("recovers the preserved item exactly once when both break events are delivered", () => {
    const { block, dimension } = fixture(16, 15, 7);
    const expected = captureDockedAspergillum(item(2, 15), 2);
    setDockedSnapshot(dimension.id, block.location, expected);
    const broken = block.destroyForBreak();
    handleAspersoriumBreak(broken);
    handleAspersoriumBreak(broken);
    advanceTicks(2);
    expect(dimension.drops).toHaveLength(1);
    expect(captureDockedAspergillum(dimension.drops[0]!.item, 2)).toEqual(expected);
    expect(snapshot(block)).toBeUndefined();
  });

  it.each(["delete", "spawn"] as const)("documents non-atomic recovery after break %s fails", (failure) => {
    const { block, dimension } = fixture(16, 8, 2);
    const expected = captureDockedAspergillum(item(3, 8), 3);
    setDockedSnapshot(dimension.id, block.location, expected);
    if (failure === "delete") world.setDynamicProperty.mockImplementationOnce(failOnce);
    else dimension.spawnItem.mockImplementationOnce(failOnce);
    handleAspersoriumBreak(block.destroyForBreak());
    advanceTicks(2);
    expect(dimension.drops).toHaveLength(failure === "delete" ? 1 : 0);
    expect(snapshot(block)).toEqual(expected);
    if (failure === "delete") {
      // Spawn-before-delete is deliberately retained. This is a known non-atomic
      // result, NOT evidence that retrying recovery would be safe.
      expect(captureDockedAspergillum(dimension.drops[0]!.item, 3)).toEqual(expected);
    }
  });

  it("does not consume a replacement snapshot written before deferred break recovery", () => {
    const { block, dimension } = fixture(16, 15);
    const original = captureDockedAspergillum(item(2, 15), 2);
    const replacement = captureDockedAspergillum(item(4, 8), 4);
    setDockedSnapshot(dimension.id, block.location, original);
    handleAspersoriumBreak(block.destroyForBreak());
    setDockedSnapshot(dimension.id, block.location, replacement);
    advanceTicks();
    expect(dimension.drops).toHaveLength(0);
    expect(snapshot(block)).toEqual(replacement);
  });

  it("recovers a distinct new occupied block broken at the same coordinate on the next tick", () => {
    const { block, dimension } = fixture(16, 15);
    const original = captureDockedAspergillum(item(2, 15), 2);
    const replacement = captureDockedAspergillum(item(4, 8), 4);
    const occupiedPermutation = block.permutation;
    setDockedSnapshot(dimension.id, block.location, original);
    handleAspersoriumBreak(block.destroyForBreak());
    advanceTicks();
    block.permutation = occupiedPermutation; // A real new occupancy before the second destruction.
    setDockedSnapshot(dimension.id, block.location, replacement);
    handleAspersoriumBreak(block.destroyForBreak());
    advanceTicks();
    expect(dimension.drops).toHaveLength(2);
    expect(captureDockedAspergillum(dimension.drops[0]!.item, 2)).toEqual(original);
    expect(captureDockedAspergillum(dimension.drops[1]!.item, 4)).toEqual(replacement);
    expect(snapshot(block)).toBeUndefined();
  });

  it("breaking an empty reservoir cancels a pending load without fabricating a drop", () => {
    const { player, block, dimension } = fixture(8);
    player.hand = item(0);
    interact(player, block);
    handleAspersoriumBreak(block.breakEvent());
    advanceTicks(20);
    expect(readAspergillumState(player.hand!).charges).toBe(0);
    expect(getLoadingSession(player.id)).toBeUndefined();
    expect(dimension.drops).toHaveLength(0);
  });
});
