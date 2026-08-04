import type { Block, BlockPermutation, ItemStack, Player } from "@minecraft/server";
import { setMainhand } from "./item-state";

export function commitMainhandAndBlock(
  player: Player,
  originalItem: ItemStack,
  updatedItem: ItemStack,
  block: Block,
  originalPermutation: BlockPermutation,
  updatedPermutation: BlockPermutation,
): boolean {
  try {
    setMainhand(player, updatedItem);
    block.setPermutation(updatedPermutation);
    return true;
  } catch (error) {
    try {
      if (player.isValid) setMainhand(player, originalItem);
    } catch (rollbackError) {
      console.error(`[Aspergillum] Item rollback failed: ${String(rollbackError)}`);
    }
    try {
      if (block.isValid) block.setPermutation(originalPermutation);
    } catch (rollbackError) {
      console.error(`[Aspergillum] Block rollback failed: ${String(rollbackError)}`);
    }
    console.error(`[Aspergillum] Loading transaction failed: ${String(error)}`);
    return false;
  }
}
