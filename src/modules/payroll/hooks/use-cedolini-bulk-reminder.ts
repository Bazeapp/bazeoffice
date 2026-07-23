import { isReminderDryRunSuccess } from "../lib/cedolini-pagamenti-filters"
import { useCedoliniBulkJob, type UseCedoliniBulkJobState } from "./use-cedolini-bulk-job"

export type UseCedoliniBulkReminderState = UseCedoliniBulkJobState

/**
 * Drives the Pagamenti bulk-reminder flow (BAZ-98/99/100 U6, R8/AE6): same
 * dry-run → confirm → sequential/stoppable sequence as Controlli's bulk
 * send, reusing the generic `useCedoliniBulkJob("reminder")` state machine
 * with the reminder-specific dry-run success predicate (`wk-reminder-pagamento`
 * response has no `details.updated` field to check, unlike mark-ready — see
 * `isReminderDryRunSuccess`).
 */
export function useCedoliniBulkReminder(): UseCedoliniBulkReminderState {
  return useCedoliniBulkJob("reminder", { isDryRunSuccess: isReminderDryRunSuccess })
}
