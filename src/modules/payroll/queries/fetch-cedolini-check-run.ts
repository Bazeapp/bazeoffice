import { supabase } from "@/lib/supabase-client"

import type { CedolinoCheckResultRecord, CedolinoCheckRunRecord } from "../types/cedolino-check"

export type CedolinoCheckRunSnapshot = {
  run: CedolinoCheckRunRecord | null
  results: CedolinoCheckResultRecord[]
}

/**
 * Reads the canonical (most recent) check run for a month directly from
 * `cedolino_check_runs` / `cedolino_check_results` — RLS grants SELECT to any
 * authenticated user (see `20260723120000_cedolino_check_runs_and_bulk_jobs.sql`).
 * Per A-S8, these tables are intentionally NOT routed through the
 * `table-query` allow-list.
 *
 * Returns `{ run: null, results: [] }` when no run has ever started for the
 * month — the Controlli view then shows the empty "Avvia analisi" state.
 */
export async function fetchCedoliniCheckRun(yearMonth: string): Promise<CedolinoCheckRunSnapshot> {
  const { data: runRows, error: runError } = await supabase
    .from("cedolino_check_runs")
    .select("id, year_month, status, total_count, checked_count, started_at, completed_at")
    .eq("year_month", yearMonth)
    .order("started_at", { ascending: false })
    .limit(1)

  if (runError) {
    throw new Error(`fetchCedoliniCheckRun failed: ${runError.message}`)
  }

  const run = (runRows?.[0] as CedolinoCheckRunRecord | undefined) ?? null
  if (!run) {
    return { run: null, results: [] }
  }

  const results = await fetchCedolinoCheckResults(run.id)
  return { run, results }
}

export async function fetchCedolinoCheckResults(
  runId: string,
): Promise<CedolinoCheckResultRecord[]> {
  const { data, error } = await supabase
    .from("cedolino_check_results")
    .select("id, run_id, mese_lavorativo_id, status, warnings, details")
    .eq("run_id", runId)

  if (error) {
    throw new Error(`fetchCedolinoCheckResults failed: ${error.message}`)
  }

  return (data ?? []) as CedolinoCheckResultRecord[]
}
