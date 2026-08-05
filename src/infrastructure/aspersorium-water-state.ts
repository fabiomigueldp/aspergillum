import type { Block, BlockPermutation } from "@minecraft/server";
import { normalizeWaterUnits } from "../domain/aspersorium-water";
import { WATER_BASE_STATE, WATER_OFFSET_STATE } from "./constants";
import { withCustomBlockState, type CustomBlockStateValue } from "./block-state";

export const WATER_HIGH_BASE = 9 as const;
export const WATER_OFFSET_MAX = 8 as const;

export interface EncodedAspersoriumWater {
  base: 0 | typeof WATER_HIGH_BASE;
  offset: number;
}

function normalizeOffset(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(WATER_OFFSET_MAX, Math.trunc(value)));
}

export function encodeAspersoriumWater(unitsInput: unknown): EncodedAspersoriumWater {
  const units = normalizeWaterUnits(unitsInput);
  if (units < WATER_HIGH_BASE) return { base: 0, offset: units };
  return { base: WATER_HIGH_BASE, offset: units - WATER_HIGH_BASE };
}

export function decodeAspersoriumWater(
  states: Readonly<Record<string, CustomBlockStateValue>>,
): number {
  const base = states[WATER_BASE_STATE] === WATER_HIGH_BASE ? WATER_HIGH_BASE : 0;
  const offset = normalizeOffset(states[WATER_OFFSET_STATE]);
  // The sole non-canonical pair (9, 8) decodes to 17 and fails safely at capacity.
  return normalizeWaterUnits(base + offset);
}

export function readAspersoriumWater(block: Block): number {
  return decodeAspersoriumWater(block.permutation.getAllStates());
}

export function withAspersoriumWater(
  permutation: BlockPermutation,
  units: unknown,
): BlockPermutation {
  const encoded = encodeAspersoriumWater(units);
  return withCustomBlockState(
    withCustomBlockState(permutation, WATER_BASE_STATE, encoded.base),
    WATER_OFFSET_STATE,
    encoded.offset,
  );
}
