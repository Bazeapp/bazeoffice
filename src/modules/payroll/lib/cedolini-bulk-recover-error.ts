import type {
  CedolinoBulkJobItemRecord,
  CedolinoBulkJobRecord,
} from "../types/cedolino-bulk-job"

/**
 * Human-readable summary for a finished `recover_url` bulk job with failures
 * (AE7). Prefers the first failed item's `details.message` (e.g. Drive not
 * configured) over the opaque `error` code, and appends a count when more
 * than one item failed.
 */
export function formatCedoliniBulkRecoverError(
  job: Pick<CedolinoBulkJobRecord, "error_count" | "total_count">,
  items: CedolinoBulkJobItemRecord[],
): string {
  const firstError = items.find((item) => item.status === "error")
  const detailMessage = firstError?.details?.message
  const message =
    typeof detailMessage === "string" && detailMessage.trim().length > 0
      ? detailMessage.trim()
      : firstError?.error
        ? `Errore recupero URL: ${firstError.error}`
        : "Recupero URL non riuscito."

  if (job.error_count <= 1) return message
  return `${message} (${job.error_count} errori su ${job.total_count})`
}
