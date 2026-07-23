import { useCedoliniBulkJob, type UseCedoliniBulkJobState } from "./use-cedolini-bulk-job"

export type UseCedoliniBulkSendState = UseCedoliniBulkJobState

/**
 * Drives the Controlli bulk-send flow (BAZ-98/99/100 U5, R4/AE2-AE4):
 * dry-run one record → operator confirms → sequential (server self-chained)
 * → stoppable. Thin wrapper of the generic `useCedoliniBulkJob("send")` —
 * see that hook for the shared state machine (extracted in U6 so Pagamenti's
 * `useCedoliniBulkReminder` does not duplicate it). `isSendDryRunSuccess`
 * (A-S7) is `deriveBulkSendPhase`'s default predicate, so no override is
 * needed here.
 */
export function useCedoliniBulkSend(): UseCedoliniBulkSendState {
  return useCedoliniBulkJob("send")
}
