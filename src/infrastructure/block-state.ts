import type { BlockPermutation } from "@minecraft/server";

export type CustomBlockStateValue = boolean | number | string;

export function readBooleanBlockState(
  states: Readonly<Record<string, CustomBlockStateValue>>,
  state: string,
): boolean {
  return states[state] === true;
}

export function withCustomBlockState(
  permutation: BlockPermutation,
  state: string,
  value: CustomBlockStateValue,
): BlockPermutation {
  // The generated API typings enumerate only vanilla state names; Bedrock supports
  // namespaced custom states at runtime, so this cast is intentionally isolated here.
  const withCustomState = permutation.withState as unknown as (
    name: string,
    stateValue: CustomBlockStateValue,
  ) => BlockPermutation;
  return withCustomState.call(permutation, state, value);
}
