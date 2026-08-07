import type { Player, RawMessage } from "@minecraft/server";

export const ACTION_MESSAGES = {
  actionBusy: "message.aspergillum.action_busy",
  alreadyLoaded: "message.aspergillum.already_loaded",
  alreadyLoading: "message.aspergillum.already_loading",
  aspersoriumAlreadyContains: "message.aspergillum.aspersorium_already_contains",
  aspersoriumAlreadyFull: "message.aspergillum.aspersorium_already_full",
  aspersoriumBusy: "message.aspergillum.aspersorium_busy",
  aspersoriumEmpty: "message.aspergillum.aspersorium_empty",
  aspersoriumFilled: "message.aspergillum.aspersorium_filled",
  chargesCreative: "message.aspergillum.charges_creative",
  chargesInspect: "message.aspergillum.charges_inspect",
  chargesLoaded: "message.aspergillum.charges_loaded",
  chargesRemaining: "message.aspergillum.charges_remaining",
  docked: "message.aspergillum.docked",
  dockedPartial: "message.aspergillum.docked_partial",
  dockedRetained: "message.aspergillum.docked_retained",
  dockedTransferred: "message.aspergillum.docked_transferred",
  dockingCancelled: "message.aspergillum.docking_cancelled",
  empty: "message.aspergillum.empty",
  emptyHandRequired: "message.aspergillum.empty_hand_required",
  futureSchema: "message.aspergillum.future_schema",
  interactionHint: "message.aspergillum.interaction_hint",
  loading: "message.aspergillum.loading",
  loadingCancelled: "message.aspergillum.loading_cancelled",
  registryRecoveryRequired: "message.aspergillum.registry_recovery_required",
  registryRepairRequired: "message.aspergillum.registry_repair_required",
  tableBusy: "message.aspergillum.table_busy",
  tableDocked: "message.aspergillum.table_docked",
  tableHint: "message.aspergillum.table_hint",
  tableUndocked: "message.aspergillum.table_undocked",
  undocked: "message.aspergillum.undocked",
  undockingCancelled: "message.aspergillum.undocking_cancelled",
} as const;

export type ActionMessage = typeof ACTION_MESSAGES[keyof typeof ACTION_MESSAGES];

export function action(player: Player, message: ActionMessage, ...parameters: Array<string | number>): void {
  const rawMessage: RawMessage = parameters.length === 0
    ? { translate: message }
    : { translate: message, with: parameters.map(String) };
  try {
    player.onScreenDisplay.setActionBar(rawMessage);
  } catch (error) {
    // HUD feedback is presentation-only and must never alter gameplay state.
    console.warn(`[Aspergillum] Unable to present ${message} for ${player.id}: ${String(error)}`);
  }
}
