/**
 * Cedolini Bulk Analyzer — Controlli check-run contract (BAZ-98/99/100 U4).
 *
 * Mirrors the schema shipped in `baze-supabase`
 * (`20260723120000_cedolino_check_runs_and_bulk_jobs.sql`) and the warning
 * categories produced by `_shared/cedolini-checks.ts`. Keep these string
 * unions in sync with the backend — they are the exact values persisted in
 * `cedolino_check_results.warnings[].category` / `*.status`.
 */

/** PRD §6 fixed warning buckets, in display order (+ "Altri" catch-all). */
export const CEDOLINO_WARNING_CATEGORIES = [
  "Pagamento Stripe",
  "Ore non coerenti",
  "Eventi presenze",
  "Cedolino o PDF",
  "Paga oraria",
  "Note/casi particolari",
  "Altri",
] as const

export type CedolinoWarningCategory = (typeof CEDOLINO_WARNING_CATEGORIES)[number]

export type CedolinoCheckWarning = {
  category: CedolinoWarningCategory
  message: string
  details?: Record<string, unknown> | null
}

export type CedolinoCheckRunStatus = "in_corso" | "completata" | "interrotta"

export type CedolinoCheckRunRecord = {
  id: string
  year_month: string
  status: CedolinoCheckRunStatus
  total_count: number
  checked_count: number
  started_at: string | null
  completed_at: string | null
}

export type CedolinoCheckResultStatus = "pending" | "processing" | "ok" | "warning" | "error"

export type CedolinoCheckResultRecord = {
  id: string
  run_id: string
  mese_lavorativo_id: string
  status: CedolinoCheckResultStatus
  warnings: CedolinoCheckWarning[] | null
  details: Record<string, unknown> | null
}

export type StartCedoliniCheckRunResponse = {
  run_id: string
  total_count: number
  checked_count?: number
  existing?: boolean
  message?: string
}
