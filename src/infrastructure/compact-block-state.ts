import type { BlockPermutation } from "@minecraft/server";
import {
  decodeAspersoriumContents, decodeTableContents, encodeAspersoriumContents, encodeTableContents,
} from "../domain/block-state-layout";
import { withCustomBlockState } from "./block-state";

export function readAspersoriumContents(permutation: BlockPermutation) {
  return decodeAspersoriumContents(permutation.getAllStates());
}
export function readTableContents(permutation: BlockPermutation) {
  return decodeTableContents(permutation.getAllStates());
}
export function withEncodedContents(permutation: BlockPermutation, states: Record<string, number>): BlockPermutation {
  let result = permutation;
  for (const [key, value] of Object.entries(states)) result = withCustomBlockState(result, key, value);
  return result;
}
export function withAspersoriumOccupancy(permutation: BlockPermutation, cosmeticIndex: number | null): BlockPermutation {
  const current = readAspersoriumContents(permutation);
  return withEncodedContents(permutation, encodeAspersoriumContents({ ...current, cosmeticIndex }));
}
export function withTableOccupancy(permutation: BlockPermutation, cosmeticIndex: number | null): BlockPermutation {
  readTableContents(permutation); // Refuse missing, legacy, mixed and reserved states before writes.
  return withEncodedContents(permutation, encodeTableContents({ cosmeticIndex }));
}

/** Fail closed at event boundaries; malformed blocks never become empty containers. */
export function hasValidCompactContents(permutation: BlockPermutation, kind: "aspersorium" | "table"): boolean {
  try {
    if (kind === "aspersorium") readAspersoriumContents(permutation);
    else readTableContents(permutation);
    return true;
  } catch (error) {
    console.warn(`[Aspergillum] Refusing incompatible ${kind} contents: ${String(error)}`);
    return false;
  }
}
