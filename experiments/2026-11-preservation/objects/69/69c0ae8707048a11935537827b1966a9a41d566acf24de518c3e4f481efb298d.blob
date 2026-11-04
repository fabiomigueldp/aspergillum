import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@minecraft/server", async () => import("../mocks/compact-runtime"));

import { encodeAspersoriumContents, encodeTableContents } from "../../src/domain/block-state-layout";
import { dockedShardPropertyId } from "../../src/domain/docking";
import { scheduleDockedBreakRecovery } from "../../src/infrastructure/break-recovery";
import { ASPERSORIUM_BLOCK, SACRISTAN_TABLE_BLOCK } from "../../src/infrastructure/constants";
import { getDockedSnapshot, setDockedSnapshot } from "../../src/infrastructure/docked-item-registry";
import { captureDockedAspergillum, createAspergillum } from "../../src/infrastructure/item-state";
import { advanceTicks, FakeBlock, FakeDimension, FakePermutation, resetRuntime, world } from "../mocks/compact-runtime";

beforeEach(() => { resetRuntime(); vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { advanceTicks(50); vi.restoreAllMocks(); });
function fixture(kind: "aspersorium" | "table" = "table") {
  const dimension = new FakeDimension();
  const occupied = new FakePermutation(kind === "table" ? SACRISTAN_TABLE_BLOCK : ASPERSORIUM_BLOCK,
    kind === "table" ? encodeTableContents({ cosmeticIndex: 0 }) : encodeAspersoriumContents({ waterUnits: 16, cosmeticIndex: 0 })).asPermutation();
  const block = new FakeBlock(dimension, occupied);
  const item = createAspergillum(3); item.nameTag = "Preserved recovery item"; item.setDynamicProperty("fixture:note", "keep");
  const snapshot = captureDockedAspergillum(item, 3);
  setDockedSnapshot(dimension.id, block.location, snapshot);
  const property = dockedShardPropertyId(dimension.id, block.location);
  const raw = world.getDynamicProperty(property);
  block.destroyForBreak();
  world.setDynamicProperty.mockClear();
  const schedule = () => scheduleDockedBreakRecovery(dimension.asDimension(), { ...block.location }, kind === "table" ? 0.8 : 0.35);
  const unchanged = () => {
    expect(world.getDynamicProperty(property)).toBe(raw);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
    expect(dimension.spawnItem).not.toHaveBeenCalled();
    expect(block.setPermutation).not.toHaveBeenCalled();
  };
  return { dimension, block, occupied, snapshot, property, raw, schedule, unchanged };
}

describe("deferred recovery requires a currently loaded air block", () => {
  it.each(["aspersorium", "table"] as const)("preserves a reoccupied %s even when its snapshot is exactly unchanged", kind => {
    const f = fixture(kind); f.schedule(); f.block.permutation = f.occupied;
    advanceTicks(); f.unchanged();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("not confirmed as loaded air"));
  });
  it.each(["minecraft:stone", "minecraft:water", "minecraft:fire", "altare:mensa"])("refuses recovery into %s without modifying that replacement", id => {
    const f = fixture(); f.schedule(); f.block.permutation = new FakePermutation(id, {}).asPermutation();
    advanceTicks(); f.unchanged(); expect(f.block.typeId).toBe(id);
  });
  it.each(["undefined", "invalid", "read-throws", "validity-throws", "air-throws", "air-unknown"] as const)("preserves bytes when location inspection is %s", reason => {
    const f = fixture(); f.schedule();
    if (reason === "undefined") f.dimension.block = undefined;
    if (reason === "invalid") f.block.isValid = false;
    if (reason === "read-throws") vi.spyOn(f.dimension, "getBlock").mockImplementation(() => { throw new Error("chunk unavailable"); });
    if (reason === "validity-throws") Object.defineProperty(f.block, "isValid", { get: () => { throw new Error("invalid reference"); } });
    if (reason === "air-throws") vi.spyOn(f.block, "isAir", "get").mockImplementation(() => { throw new Error("chunk unloaded"); });
    if (reason === "air-unknown") Object.defineProperty(f.block, "isAir", { value: undefined });
    advanceTicks(); f.unchanged();
  });
  it.each(["aspersorium", "table"] as const)("keeps existing %s recovery behavior for valid loaded air and unchanged snapshot", kind => {
    const f = fixture(kind); const lookup = vi.spyOn(f.dimension, "getBlock"); f.schedule();
    expect(lookup).not.toHaveBeenCalled();
    advanceTicks();
    expect(lookup).toHaveBeenCalledExactlyOnceWith(f.block.location);
    expect(f.dimension.drops).toHaveLength(1);
    expect(captureDockedAspergillum(f.dimension.drops[0]!.item, 3)).toEqual(f.snapshot);
    expect(getDockedSnapshot(f.dimension.id, f.block.location)).toBeUndefined();
  });
  it("refuses the historical empty-item fallback even when the location is loaded air", () => {
    const f = fixture(); world.setDynamicProperty(f.property, undefined); world.setDynamicProperty.mockClear();
    f.schedule(); advanceTicks();
    expect(f.dimension.drops).toHaveLength(0);
    expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
  it("does not fabricate the legacy fallback into a replacement when the snapshot is missing", () => {
    const f = fixture(); world.setDynamicProperty(f.property, undefined); world.setDynamicProperty.mockClear();
    f.schedule(); f.block.permutation = f.occupied; advanceTicks();
    expect(f.dimension.spawnItem).not.toHaveBeenCalled(); expect(world.setDynamicProperty).not.toHaveBeenCalled();
  });
  it("still preserves a changed snapshot even when the address is air", () => {
    const f = fixture(); f.schedule();
    const replacement = captureDockedAspergillum(createAspergillum(1), 1);
    setDockedSnapshot(f.dimension.id, f.block.location, replacement); world.setDynamicProperty.mockClear();
    advanceTicks();
    expect(f.dimension.spawnItem).not.toHaveBeenCalled(); expect(world.setDynamicProperty).not.toHaveBeenCalled();
    expect(getDockedSnapshot(f.dimension.id, f.block.location)).toEqual(replacement);
  });
  it("does not schedule an automatic retry when a refused location later becomes air", () => {
    const f = fixture(); f.schedule(); f.block.permutation = f.occupied; advanceTicks(); f.unchanged();
    f.block.destroyForBreak(); advanceTicks(100); f.unchanged();
  });
});
