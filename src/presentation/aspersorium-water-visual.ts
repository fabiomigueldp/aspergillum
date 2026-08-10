import {
  Block,
  Dimension,
  Entity,
  system,
  type Vector3,
} from "@minecraft/server";
import { aspersoriumWaterVisualLevel } from "../domain/aspersorium-water";
import { readAspersoriumWater } from "../infrastructure/aspersorium-water-state";
import { ASPERSORIUM_BLOCK } from "../infrastructure/constants";

export const ASPERSORIUM_WATER_VISUAL_ENTITY = "aspergillum:aspersorium_water_visual";
export const ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY = "aspergillum:water_visual_level";

const BLOCK_X_PROPERTY = "aspergillum:block_x";
const BLOCK_Y_PROPERTY = "aspergillum:block_y";
const BLOCK_Z_PROPERTY = "aspergillum:block_z";
const pendingReconciliations = new Set<string>();

function blockKey(dimension: Dimension, location: Vector3): string {
  return `${dimension.id}|${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

function blockLocation(location: Vector3): Vector3 {
  return {
    x: Math.floor(location.x),
    y: Math.floor(location.y),
    z: Math.floor(location.z),
  };
}

function visualAnchor(location: Vector3): Vector3 {
  return {
    x: Math.floor(location.x) + 0.5,
    y: Math.floor(location.y),
    z: Math.floor(location.z) + 0.5,
  };
}

function isWaterVisual(entity: Entity): boolean {
  return entity.typeId === ASPERSORIUM_WATER_VISUAL_ENTITY;
}

function safelyRemove(entity: Entity): void {
  try {
    if (entity.isValid) entity.remove();
  } catch (error) {
    console.warn(`[Aspergillum entity-water] Could not remove water visual ${entity.id}: ${String(error)}`);
  }
}

function visualEntitiesAt(dimension: Dimension, location: Vector3): Entity[] {
  try {
    return dimension
      .getEntitiesAtBlockLocation(blockLocation(location))
      .filter(isWaterVisual)
      .sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    console.warn(`[Aspergillum entity-water] Could not query water visuals: ${String(error)}`);
    return [];
  }
}

function bindVisualToBlock(entity: Entity, location: Vector3, level: 1 | 2 | 3 | 4): void {
  const anchor = visualAnchor(location);
  const dx = entity.location.x - anchor.x;
  const dy = entity.location.y - anchor.y;
  const dz = entity.location.z - anchor.z;
  if (dx * dx + dy * dy + dz * dz > 0.000001) entity.teleport(anchor);
  if (entity.getProperty(ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY) !== level) {
    entity.setProperty(ASPERSORIUM_WATER_VISUAL_LEVEL_PROPERTY, level);
  }
  const x = Math.floor(location.x);
  const y = Math.floor(location.y);
  const z = Math.floor(location.z);
  if (
    entity.getDynamicProperty(BLOCK_X_PROPERTY) !== x
    || entity.getDynamicProperty(BLOCK_Y_PROPERTY) !== y
    || entity.getDynamicProperty(BLOCK_Z_PROPERTY) !== z
  ) {
    entity.setDynamicProperties({
      [BLOCK_X_PROPERTY]: x,
      [BLOCK_Y_PROPERTY]: y,
      [BLOCK_Z_PROPERTY]: z,
    });
  }
}

export function reconcileAspersoriumWaterVisual(block: Block, loadedVisual?: Entity): void {
  if (!block.isValid || block.typeId !== ASPERSORIUM_BLOCK) return;

  const level = aspersoriumWaterVisualLevel(readAspersoriumWater(block));
  const visuals = visualEntitiesAt(block.dimension, block.location);
  if (
    loadedVisual?.isValid
    && isWaterVisual(loadedVisual)
    && !visuals.some((candidate) => candidate.id === loadedVisual.id)
  ) {
    visuals.push(loadedVisual);
    visuals.sort((left, right) => left.id.localeCompare(right.id));
  }
  if (level === 0) {
    for (const visual of visuals) safelyRemove(visual);
    return;
  }

  let visual = visuals.shift();
  for (const duplicate of visuals) safelyRemove(duplicate);
  try {
    visual ??= block.dimension.spawnEntity(
      ASPERSORIUM_WATER_VISUAL_ENTITY,
      visualAnchor(block.location),
    );
    bindVisualToBlock(visual, block.location, level);
  } catch (error) {
    console.warn(`[Aspergillum entity-water] Could not reconcile water visual: ${String(error)}`);
  }
}

export function scheduleAspersoriumWaterVisualReconciliation(block: Block): void {
  if (!block.isValid) return;
  const dimension = block.dimension;
  const location = blockLocation(block.location);
  const key = blockKey(dimension, location);
  if (pendingReconciliations.has(key)) return;
  pendingReconciliations.add(key);
  system.run(() => {
    pendingReconciliations.delete(key);
    try {
      const current = dimension.getBlock(location);
      if (current?.isValid && current.typeId === ASPERSORIUM_BLOCK) {
        reconcileAspersoriumWaterVisual(current);
      } else {
        for (const visual of visualEntitiesAt(dimension, location)) safelyRemove(visual);
      }
    } catch (error) {
      console.warn(`[Aspergillum entity-water] Deferred water reconciliation failed: ${String(error)}`);
    }
  });
}

export function scheduleAspersoriumWaterVisualRemoval(
  dimension: Dimension,
  locationInput: Vector3,
): void {
  const location = blockLocation(locationInput);
  system.run(() => {
    for (const visual of visualEntitiesAt(dimension, location)) safelyRemove(visual);
  });
}

function linkedBlockLocation(entity: Entity): Vector3 {
  const x = entity.getDynamicProperty(BLOCK_X_PROPERTY);
  const y = entity.getDynamicProperty(BLOCK_Y_PROPERTY);
  const z = entity.getDynamicProperty(BLOCK_Z_PROPERTY);
  if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
    return blockLocation({ x, y, z });
  }
  return blockLocation(entity.location);
}

export function reconcileLoadedAspersoriumWaterVisual(entity: Entity): void {
  if (!isWaterVisual(entity)) return;
  system.run(() => {
    if (!entity.isValid) return;
    try {
      const location = linkedBlockLocation(entity);
      const block = entity.dimension.getBlock(location);
      if (block?.isValid && block.typeId === ASPERSORIUM_BLOCK) {
        reconcileAspersoriumWaterVisual(block, entity);
      } else {
        safelyRemove(entity);
      }
    } catch (error) {
      console.warn(`[Aspergillum entity-water] Loaded water visual reconciliation failed: ${String(error)}`);
    }
  });
}
