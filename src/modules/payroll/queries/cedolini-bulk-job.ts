import { supabase } from "@/lib/supabase-client"
import { runTrackedEdgeFunction } from "@/lib/write-tracking"

import type {
  CedolinoBulkJobItemRecord,
  CedolinoBulkJobKind,
  CedolinoBulkJobRecord,
  ProcessCedoliniBulkJobResponse,
  StartCedoliniBulkJobResponse,
  StopCedoliniBulkJobResponse,
} from "../types/cedolino-bulk-job"

const BULK_JOB_COLUMNS =
  "id, kind, year_month, status, stop_requested, started_at, completed_at, total_count, processed_count, success_count, skipped_count, error_count"

const BULK_JOB_ITEM_COLUMNS = "id, job_id, mese_lavorativo_id, status, error, details, processed_at"

/**
 * Starts a Cedolini bulk job (BAZ-98/99/100 U3 `cedolini-bulk-job`, action
 * `"start"`). With `dryRunFirst: true` the response's `dry_run` field holds
 * the outcome of processing the FIRST id only (R4) — the server does NOT
 * auto-continue; call {@link processCedoliniBulkJob} with the returned
 * `job_id` after the operator confirms (see `use-cedolini-bulk-send.ts`).
 */
export async function startCedoliniBulkJob(params: {
  kind: CedolinoBulkJobKind
  meseLavorativoIds: string[]
  yearMonth?: string
  dryRunFirst?: boolean
}): Promise<StartCedoliniBulkJobResponse> {
  return runTrackedEdgeFunction<StartCedoliniBulkJobResponse>("cedolini-bulk-job", {
    action: "start",
    kind: params.kind,
    mese_lavorativo_ids: params.meseLavorativoIds,
    ...(params.yearMonth ? { year_month: params.yearMonth } : {}),
    dry_run_first: params.dryRunFirst ?? false,
  })
}

/**
 * Continues a job (action `"process"`): claims and processes the next
 * pending item(s), then self-chains server-side for the remainder (AE3:
 * stoppable — see {@link stopCedoliniBulkJob}) until no pending items
 * remain or a stop was requested. The FE only needs to call this ONCE after
 * a confirmed dry run; poll the job row afterwards for progress.
 */
export async function processCedoliniBulkJob(
  jobId: string,
  limit?: number,
): Promise<ProcessCedoliniBulkJobResponse> {
  return runTrackedEdgeFunction<ProcessCedoliniBulkJobResponse>("cedolini-bulk-job", {
    action: "process",
    job_id: jobId,
    ...(limit ? { limit } : {}),
  })
}

/**
 * Requests a stop (action `"stop"`): sets `stop_requested`. The job settles
 * to `interrotta` once any in-flight item finishes — no new items are
 * claimed once this returns (AE3: resume never re-processes terminal items).
 */
export async function stopCedoliniBulkJob(jobId: string): Promise<StopCedoliniBulkJobResponse> {
  return runTrackedEdgeFunction<StopCedoliniBulkJobResponse>("cedolini-bulk-job", {
    action: "stop",
    job_id: jobId,
  })
}

/**
 * Reads the job row directly from `cedolino_bulk_jobs` — RLS grants SELECT
 * to any authenticated user (writes are service-role only, via the edge
 * function). Used for progress polling (KTD11) instead of round-tripping
 * through the edge function on every poll tick.
 */
export async function fetchCedoliniBulkJob(jobId: string): Promise<CedolinoBulkJobRecord | null> {
  const { data, error } = await supabase
    .from("cedolino_bulk_jobs")
    .select(BULK_JOB_COLUMNS)
    .eq("id", jobId)
    .maybeSingle()

  if (error) {
    throw new Error(`fetchCedoliniBulkJob failed: ${error.message}`)
  }

  return (data as CedolinoBulkJobRecord | null) ?? null
}

/** Per-record outcomes for a job — mainly for debugging/detail views beyond the aggregate counters on the job row. */
export async function fetchCedoliniBulkJobItems(jobId: string): Promise<CedolinoBulkJobItemRecord[]> {
  const { data, error } = await supabase
    .from("cedolino_bulk_job_items")
    .select(BULK_JOB_ITEM_COLUMNS)
    .eq("job_id", jobId)

  if (error) {
    throw new Error(`fetchCedoliniBulkJobItems failed: ${error.message}`)
  }

  return (data ?? []) as CedolinoBulkJobItemRecord[]
}
