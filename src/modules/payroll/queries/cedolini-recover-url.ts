import { runTrackedEdgeFunction } from "@/lib/write-tracking"

import { parseEdgeFunctionErrorBody } from "../lib/cedolini-edge-function-error"
import type { RecoverCedolinoUrlResponse } from "../types/cedolino-bulk-job"

/**
 * Single-record `cedolino_url` recovery (BAZ-98/99/100 U3
 * `cedolini-recover-url`, R6/AE7): Storage PDF → Drive share link when
 * configured → otherwise / on Drive failure a 30-day Storage signed URL →
 * write `cedolino_url` → full recheck. Used for the per-card "Recupera URL"
 * action; bulk recovery on the "Cedolino o PDF" group goes through
 * `cedolini-bulk-job` (`kind: "recover_url"`) instead — see
 * `queries/cedolini-bulk-job.ts`.
 *
 * The edge function returns a *structured* body even on failure (now
 * typically 400 — e.g. `{ recovered: false, error: "storage_sign_failed" }`
 * when signed-URL creation fails; older backends may still return 503 with
 * `drive_not_configured`). `invokeEdgeFunction` throws a generic `Error` on
 * non-2xx responses, so this wrapper recovers the original structured body
 * via `parseEdgeFunctionErrorBody` and returns it normally instead of
 * throwing — callers branch on `result.recovered` exactly like a 200
 * response.
 */
export async function recoverCedolinoUrl(
  meseLavorativoId: string,
): Promise<RecoverCedolinoUrlResponse> {
  try {
    return await runTrackedEdgeFunction<RecoverCedolinoUrlResponse>("cedolini-recover-url", {
      mese_lavorativo_id: meseLavorativoId,
    })
  } catch (error) {
    const body = parseEdgeFunctionErrorBody(error)
    if (body && typeof body.recovered === "boolean") {
      return body as unknown as RecoverCedolinoUrlResponse
    }
    throw error
  }
}
