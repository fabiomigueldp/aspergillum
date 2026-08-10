import type { Block, Dimension, Entity, Vector3 } from "@minecraft/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WATER_BASE_STATE, WATER_OFFSET_STATE } from "../../src/infrastructure/constants";

const scheduledRuns = vi.hoisted(() => [] as Array<() => void>);

vi.mock("@minecraft/server", () => ({
  system: {
    run(callback: () => void) {
      scheduledRuns.push(callback);
      return scheduledRuns.length;
    },
  },
}));

import {
  ASPERSORIUM_WATER_VISUAL_ENTITY,
  ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY,
  reconcileAspersoriumWaterVisual,
  reconcileLoadedAspersoriumWaterVisual,
  scheduleAspersoriumWaterVisualReconciliation,
  scheduleAspersoriumWaterVisualRemoval,
} from "../../src/presentation/aspersorium-water-visual";
import { ASPERSORIUM_BLOCK } from "../../src/infrastructure/constants";

const BLOCK_PROPERTY_NAMES = ["aspergillum:block_x", "aspergillum:block_y", "aspergillum:block_z"] as const;

class FakeEntity {
  readonly typeId = ASPERSORIUM_WATER_VISUAL_ENTITY;
  readonly properties = new Map<string, unknown>();
  readonly dynamicProperties = new Map<string, unknown>();
  isValid = true;
  removeCount = 0;
  teleportCount = 0;

  constructor(
    readonly id: string,
    readonly dimension: FakeDimension,
    public location: Vector3,
  ) {}

  remove(): void {
    this.removeCount += 1;
    this.isValid = false;
  }

  teleport(location: Vector3): void {
    this.teleportCount += 1;
    this.location = { ...location };
  }

  getProperty(name: string): unknown {
    return this.properties.get(name);
  }

  setProperty(name: string, value: unknown): void {
    this.properties.set(name, value);
  }

  getDynamicProperty(name: string): unknown {
    return this.dynamicProperties.get(name);
  }

  setDynamicProperties(values: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(values)) this.dynamicProperties.set(name, value);
  }
}

class FakeDimension {
  readonly id: string;
  readonly entities: FakeEntity[] = [];
  currentBlock: FakeBlock | undefined;
  spawnCount = 0;

  constructor(id = "minecraft:overworld") {
    this.id = id;
  }

  getEntitiesAtBlockLocation(location: Vector3): Entity[] {
    return this.entities.filter((entity) => (
      entity.isValid
      && Math.floor(entity.location.x) === Math.floor(location.x)
      && Math.floor(entity.location.y) === Math.floor(location.y)
      && Math.floor(entity.location.z) === Math.floor(location.z)
    )) as unknown as Entity[];
  }

  spawnEntity(_typeId: string, location: Vector3): Entity {
    this.spawnCount += 1;
    const entity = new FakeEntity(`spawned-${this.spawnCount}`, this, { ...location });
    this.entities.push(entity);
    return entity as unknown as Entity;
  }

  getBlock(location: Vector3): Block | undefined {
    const block = this.currentBlock;
    if (!block) return undefined;
    return block.location.x === Math.floor(location.x)
      && block.location.y === Math.floor(location.y)
      && block.location.z === Math.floor(location.z)
      ? block as unknown as Block
      : undefined;
  }
}

class FakeBlock {
  readonly typeId = ASPERSORIUM_BLOCK;
  isValid = true;
  units = 0;

  constructor(
    readonly dimension: FakeDimension,
    readonly location: Vector3,
  ) {
    dimension.currentBlock = this;
  }

  readonly permutation = {
    getAllStates: () => ({
      [WATER_BASE_STATE]: this.units >= 9 ? 9 : 0,
      [WATER_OFFSET_STATE]: this.units >= 9 ? this.units - 9 : this.units,
    }),
  };
}

function addVisual(dimension: FakeDimension, id: string, location: Vector3): FakeEntity {
  const entity = new FakeEntity(id, dimension, { ...location });
  dimension.entities.push(entity);
  return entity;
}

function flushScheduledRuns(): void {
  while (scheduledRuns.length) scheduledRuns.shift()?.();
}

describe("aspersorium entity-water reconciliation", () => {
  beforeEach(() => {
    scheduledRuns.length = 0;
  });

  it("spawns one anchored visual and maps all non-empty water bands to levels 1..4", () => {
    for (const [units, expectedLevel] of [[1, 1], [5, 2], [9, 3], [13, 4]] as const) {
      const dimension = new FakeDimension(`dimension-${units}`);
      const block = new FakeBlock(dimension, { x: 3, y: 70, z: -5 });
      block.units = units;

      reconcileAspersoriumWaterVisual(block as unknown as Block);

      expect(dimension.spawnCount).toBe(1);
      const visual = dimension.entities[0];
      expect(visual?.location).toEqual({ x: 3.5, y: 70, z: -4.5 });
      expect(visual?.properties.get(ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY)).toBe(expectedLevel);
      expect(BLOCK_PROPERTY_NAMES.map((name) => visual?.dynamicProperties.get(name))).toEqual([3, 70, -5]);
    }
  });

  it("keeps a deterministic visual, recenters it, updates its level, and removes duplicates", () => {
    const dimension = new FakeDimension();
    const block = new FakeBlock(dimension, { x: 8, y: 64, z: 2 });
    block.units = 10;
    const duplicate = addVisual(dimension, "visual-z", { x: 8.7, y: 64, z: 2.7 });
    const keeper = addVisual(dimension, "visual-a", { x: 8.2, y: 64, z: 2.2 });

    reconcileAspersoriumWaterVisual(block as unknown as Block);

    expect(keeper.isValid).toBe(true);
    expect(keeper.location).toEqual({ x: 8.5, y: 64, z: 2.5 });
    expect(keeper.teleportCount).toBe(1);
    expect(keeper.properties.get(ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY)).toBe(3);
    expect(duplicate.removeCount).toBe(1);
    expect(dimension.spawnCount).toBe(0);
  });

  it("removes every visual when the logical basin is empty", () => {
    const dimension = new FakeDimension();
    const block = new FakeBlock(dimension, { x: 0, y: 80, z: 0 });
    const first = addVisual(dimension, "a", { x: 0.5, y: 80, z: 0.5 });
    const second = addVisual(dimension, "b", { x: 0.6, y: 80, z: 0.6 });

    reconcileAspersoriumWaterVisual(block as unknown as Block);

    expect(first.removeCount).toBe(1);
    expect(second.removeCount).toBe(1);
    expect(dimension.spawnCount).toBe(0);
  });

  it("coalesces deferred reconciliation and revalidates the block at execution time", () => {
    const dimension = new FakeDimension();
    const block = new FakeBlock(dimension, { x: 4, y: 65, z: 7 });
    block.units = 4;
    const orphan = addVisual(dimension, "orphan", { x: 4.5, y: 65, z: 7.5 });

    scheduleAspersoriumWaterVisualReconciliation(block as unknown as Block);
    scheduleAspersoriumWaterVisualReconciliation(block as unknown as Block);
    expect(scheduledRuns).toHaveLength(1);

    dimension.currentBlock = undefined;
    flushScheduledRuns();
    expect(orphan.removeCount).toBe(1);
    expect(dimension.spawnCount).toBe(0);
  });

  it("removes visuals only after the scheduled block-removal boundary", () => {
    const dimension = new FakeDimension();
    const location = { x: -2, y: 70, z: 9 };
    const visual = addVisual(dimension, "remove-later", { x: -1.5, y: 70, z: 9.5 });

    scheduleAspersoriumWaterVisualRemoval(dimension as unknown as Dimension, location);
    expect(visual.isValid).toBe(true);
    flushScheduledRuns();
    expect(visual.removeCount).toBe(1);
  });

  it("uses persisted block coordinates to recover a drifted loaded visual without leaving a duplicate", () => {
    const dimension = new FakeDimension();
    const block = new FakeBlock(dimension, { x: 12, y: 66, z: 12 });
    block.units = 16;
    const loaded = addVisual(dimension, "loaded", { x: 13.2, y: 66, z: 12.5 });
    loaded.setDynamicProperties({
      "aspergillum:block_x": 12,
      "aspergillum:block_y": 66,
      "aspergillum:block_z": 12,
    });

    reconcileLoadedAspersoriumWaterVisual(loaded as unknown as Entity);
    flushScheduledRuns();

    expect(loaded.isValid).toBe(true);
    expect(loaded.location).toEqual({ x: 12.5, y: 66, z: 12.5 });
    expect(loaded.properties.get(ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY)).toBe(4);
    expect(dimension.spawnCount).toBe(0);
  });

  it("removes a loaded visual when its linked aspersorium no longer exists", () => {
    const dimension = new FakeDimension();
    const visual = addVisual(dimension, "orphan-loaded", { x: 2.5, y: 60, z: 2.5 });

    reconcileLoadedAspersoriumWaterVisual(visual as unknown as Entity);
    flushScheduledRuns();

    expect(visual.removeCount).toBe(1);
  });
});
