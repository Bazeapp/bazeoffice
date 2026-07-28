/**
 * Cedolini Bulk Analyzer — bulk job / mark-ready / recover-url contracts
 * (BAZ-98/99/100 U5).
 *
 * Mirrors the schema shipped in `baze-supabase`
 * (`20260723120000_cedolino_check_runs_and_bulk_jobs.sql`) and the
 * `cedolini-bulk-job` / `cedolini-mark-ready` / `cedolini-recover-url` edge
 * functions (U3). Keep these string unions in sync with the backend.
 *
 * U5 only drives `kind: "send"` (bulk send) and `kind: "recover_url"`
 * (bulk/single URL recovery) from the FE; `"reminder"` is U6 (Pagamenti)
 * scope and is included here only so the type union matches the backend
 * exactly.
 */

export const CEDOLINO_BULK_JOB_KINDS = ["send", "reminder", "recover_url"] as const
export type CedolinoBulkJobKind = (typeof CEDOLINO_BULK_JOB_KINDS)[number]

export type CedolinoBulkJobStatus = "pending" | "in_corso" | "completata" | "interrotta" | "failed"

export type CedolinoBulkJobItemStatus = "pending" | "processing" | "success" | "skipped" | "error"

export type CedolinoBulkJobRecord = {
  id: string
  kind: CedolinoBulkJobKind
  year_month: string | null
  status: CedolinoBulkJobStatus
  stop_requested: boolean
  started_at: string | null
  completed_at: string | null
  total_count: number
  processed_count: number
  success_count: number
  skipped_count: number
  error_count: number
}

export type CedolinoBulkJobItemRecord = {
  id: string
  job_id: string
  mese_lavorativo_id: string
  status: CedolinoBulkJobItemStatus
  error: string | null
  details: Record<string, unknown> | null
  processed_at: string | null
}

/** Shape of a single processed item outcome, as returned inline by `start` (dry run) or persisted on the item row. */
export type CedolinoBulkJobItemOutcome = {
  status: "success" | "skipped" | "error"
  error?: string
  details?: Record<string, unknown>
}

export type CedolinoBulkJobDryRunOutcome = CedolinoBulkJobItemOutcome & {
  mese_lavorativo_id: string
}

export type StartCedoliniBulkJobResponse = {
  job_id: string
  total_count: number
  message?: string
  /** Present only when the request set `dry_run_first: true`. `null` when `total_count` is 0. */
  dry_run?: CedolinoBulkJobDryRunOutcome | null
}

export type ProcessCedoliniBulkJobResponse = {
  job_id: string
  status: CedolinoBulkJobStatus
  processed: number
  remaining?: number
  message?: string
}

export type StopCedoliniBulkJobResponse = {
  job_id: string
  status: CedolinoBulkJobStatus
  stop_requested: boolean
}

// --- cedolini-mark-ready -----------------------------------------------------

export type MarkReadySkipReason =
  | "not_found"
  | "missing_cedolino"
  | "missing_mese_id"
  | "excluded_caso_particolare"
  | "already_processed"

export type MarkCedolinoReadyResponse = {
  updated: boolean
  skipped?: boolean
  reason?: MarkReadySkipReason | string
  message?: string
}

// --- cedolini-recover-url -----------------------------------------------------

export type RecoverCedolinoUrlErrorCode =
  | "drive_not_configured"
  | "not_found"
  | "cedolino_missing"
  | "download_failed"
  | "upload_failed"
  | "db_error"

export type RecoverCedolinoUrlRecheckOutcome = {
  applied: boolean
  status?: "ok" | "warning" | "error"
  message?: string
}

export type RecoverCedolinoUrlResponse = {
  recovered: boolean
  cedolino_url?: string
  error?: RecoverCedolinoUrlErrorCode | string
  message?: string
  recheck?: RecoverCedolinoUrlRecheckOutcome
}
