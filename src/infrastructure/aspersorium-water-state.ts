import type { Block, BlockPermutation } from "@minecraft/server";
import { decodeAspersoriumContents, encodeAspersoriumContents, type BlockStates } from "../domain/block-state-layout";
import { readAspersoriumContents, withEncodedContents } from "./compact-block-state";

export function decodeAspersoriumWater(states: BlockStates): number {
  return decodeAspersoriumContents(states).waterUnits;
}
export function readAspersoriumWater(block: Block): number {
  return readAspersoriumContents(block.permutation).waterUnits;
}
export function withAspersoriumWater(permutation: BlockPermutation, units: number): BlockPermutation {
  const current = readAspersoriumContents(permutation);
  return withEncodedContents(permutation, encodeAspersoriumContents({ ...current, waterUnits: units }));
}
