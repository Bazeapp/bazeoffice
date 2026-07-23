import { runTrackedEdgeFunction } from "@/lib/write-tracking"

import type { StartCedoliniCheckRunResponse } from "../types/cedolino-check"

/**
 * Starts (or reuses an already-running) Cedolini Controlli bulk-analysis run
 * for `yearMonth` (see `cedolini-check-start` edge function). Tracked so the
 * resulting writes to `cedolino_check_runs` / `cedolino_check_results` are
 * recognised as ours if/when those tables join realtime board sync later.
 */
export async function startCedoliniCheckRun(
  yearMonth: string,
): Promise<StartCedoliniCheckRunResponse> {
  return runTrackedEdgeFunction<StartCedoliniCheckRunResponse>("cedolini-check-start", {
    year_month: yearMonth,
  })
}
