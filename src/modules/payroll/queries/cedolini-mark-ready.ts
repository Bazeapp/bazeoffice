import { runTrackedEdgeFunction } from "@/lib/write-tracking"

import type { MarkCedolinoReadyResponse } from "../types/cedolino-bulk-job"

/**
 * Single-record conditional mark-ready (BAZ-98/99/100 U3 `cedolini-mark-ready`,
 * KTD3). Sets `stato_mese_lavorativo` to `Cedolino Pronto` ONLY when the row
 * is still `Cedolino da controllare` — the exact same server-side
 * `markCedolinoReady` code path the `cedolini-bulk-job` (`kind: "send"`)
 * worker uses, so this and the bulk flow can never diverge on when it is
 * safe to flip the status.
 *
 * The U5 bulk-send dialog drives dry-run/confirm/sequential send entirely
 * through `cedolini-bulk-job` (see `queries/cedolini-bulk-job.ts` +
 * `hooks/use-cedolini-bulk-send.ts`) so its progress/stop semantics stay
 * consistent — this single-record wrapper is kept as the product's public
 * per-record endpoint (mirrors `cedolini-recover-url`'s per-card shape) for
 * any future single-record action.
 *
 * NEVER use `updateRecord` / an unconditional `.update()` for this
 * transition — see KTD3 / AGENTS.md constraint for this feature.
 */
export async function markCedolinoReady(
  meseLavorativoId: string,
): Promise<MarkCedolinoReadyResponse> {
  return runTrackedEdgeFunction<MarkCedolinoReadyResponse>("cedolini-mark-ready", {
    mese_lavorativo_id: meseLavorativoId,
  })
}
