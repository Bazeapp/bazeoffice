/**
 * Cedolini Controlli — pure state-machine + eligibility helpers for the bulk
 * send flow (BAZ-98/99/100 U5, R4/KTD10/A-S7/AE2-AE4).
 *
 * No React/Supabase here: `useCedoliniBulkSend` (hook) and
 * `CedoliniControlliSendDialog` (UI) both derive from these pure functions
 * so the dry-run → confirm → sequential/stoppable semantics are
 * unit-testable in isolation.
 */
import type { PayrollBoardColumnData } from "../types"
import type { CedolinoCheckCard } from "./cedolini-check-warnings"
import type {
  CedolinoBulkJobDryRunOutcome,
  CedolinoBulkJobRecord,
  CedolinoBulkJobStatus,
} from "../types/cedolino-bulk-job"

// --- Send eligibility (Pronti ∩ still "Cedolino da controllare" on the board) -

/** `mesi_lavorati.id → stage` from the board columns (`usePayrollBoard`). */
export function buildBoardStageMap(columns: PayrollBoardColumnData[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const column of columns) {
    for (const card of column.cards) {
      map.set(card.id, card.stage)
    }
  }
  return map
}

/**
 * Ids eligible for a bulk-send dry run/confirm: Pronti cards (`status ===
 * "ok"`) whose underlying `mesi_lavorati` row the Board still shows as
 * "Cedolino da controllare" (plan U5 approach point 3). The Board doesn't
 * necessarily carry every id an old check run classified (different month
 * filters, etc.) — when a card's id is absent from the board's stage map we
 * don't block it; the server-side conditional mark-ready (KTD3) is the real
 * source of truth either way, this is only a client-side convenience guard
 * against re-sending a card visibly dragged away on the Board.
 */
export function getSendEligibleMeseLavorativoIds(
  prontiCards: CedolinoCheckCard[],
  columns: PayrollBoardColumnData[],
): string[] {
  const stageMap = buildBoardStageMap(columns)
  return prontiCards
    .filter((card) => {
      const stage = stageMap.get(card.meseLavorativoId)
      return stage === undefined || stage === "Cedolino da controllare"
    })
    .map((card) => card.meseLavorativoId)
}

// --- Dry-run outcome interpretation (A-S7) ------------------------------------

/**
 * A-S7: dry-run SUCCESS for `kind: "send"` means the item status is
 * `"success"` AND `details.updated === true` (the conditional mark-ready
 * actually flipped the row to `Cedolino Pronto`). `"skipped"`/`"error"` — or
 * a `"success"` status with `updated` missing/false, which should not
 * happen for `kind: "send"` but is checked defensively — fail the dry run
 * (AE2: the remainder must never start).
 */
export function isSendDryRunSuccess(outcome: CedolinoBulkJobDryRunOutcome | null): boolean {
  if (!outcome) return false
  return outcome.status === "success" && outcome.details?.updated === true
}

// --- State machine -------------------------------------------------------------

export type CedolinoBulkSendPhase =
  | "idle"
  | "dry_running"
  | "dry_run_failed"
  | "confirm_pending"
  | "processing"
  | "completata"
  | "interrotta"
  | "error"

/**
 * Derives the send dialog's phase purely from current inputs — no phase is
 * ever stored/synced via `useEffect` (best-practice 5.1: derive during
 * render). `jobStatus` is the polled `cedolino_bulk_jobs.status`; it is
 * `null` until the job row has been fetched at least once.
 */
export function deriveBulkSendPhase(params: {
  isStartingDryRun: boolean
  jobId: string | null
  dryRunOutcome: CedolinoBulkJobDryRunOutcome | null
  jobStatus: CedolinoBulkJobStatus | null
}): CedolinoBulkSendPhase {
  if (params.isStartingDryRun) return "dry_running"
  if (!params.jobId) return "idle"
  if (params.jobStatus === "completata") return "completata"
  if (params.jobStatus === "interrotta") return "interrotta"
  if (params.jobStatus === "failed") return "error"
  if (params.jobStatus === "in_corso") return "processing"
  // Job created but not yet claimed/processed beyond the dry-run item.
  if (params.dryRunOutcome && !isSendDryRunSuccess(params.dryRunOutcome)) return "dry_run_failed"
  if (params.dryRunOutcome) return "confirm_pending"
  return "idle"
}

// --- Progress / counts ----------------------------------------------------------

export function getBulkJobProgressPercent(
  job: Pick<CedolinoBulkJobRecord, "processed_count" | "total_count"> | null,
): number {
  if (!job || !job.total_count || job.total_count <= 0) return 0
  return Math.min(100, Math.round((job.processed_count / job.total_count) * 100))
}

/**
 * Remaining (not-yet-processed) count for the confirm/progress copy. Falls
 * back to `totalCount - 1` (the single dry-run item) before the job row has
 * been fetched at least once, so the confirm dialog never flashes a wrong
 * count while the first poll is in flight.
 */
export function getBulkSendRemainingCount(params: {
  totalCount: number
  job: Pick<CedolinoBulkJobRecord, "processed_count"> | null
}): number {
  if (!params.job) return Math.max(0, params.totalCount - 1)
  return Math.max(0, params.totalCount - params.job.processed_count)
}
