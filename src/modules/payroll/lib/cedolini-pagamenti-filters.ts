/**
 * Cedolini Pagamenti — pure eligibility/split/date-filter helpers for the
 * reminder bulk flow (BAZ-98/99/100 U6, R7/R8/AE6/OQ6; BAZ-180 selection).
 *
 * No React/Supabase here: `useCedoliniPagamenti` (hook) and
 * `CedoliniPagamentiView` (UI) both derive from these pure functions so the
 * "Inviato cedolino + Baze Pay + transazione" eligibility, da fare/fatti
 * split, date-filter-binds-bulk-ids (AE6), and per-family bulk exclusions
 * are unit-testable in isolation.
 */
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import type { CedolinoBulkJobDryRunOutcome } from "../types/cedolino-bulk-job"
import { isAbbonamentoCard, normalizeCaseFlag } from "./cedolini-filters"

/** The one board stage Pagamenti (R7) looks at. */
const INVIATO_CEDOLINO_STAGE = "Inviato cedolino"

// --- Candidate rows (R7 + BAZ-180) -------------------------------------------

/**
 * Hard eligibility for Pagamenti reminder lists (BAZ-180):
 * - linked `transazioni_finanziarie` (R7)
 * - Baze Pay only (`richiestaAttivazione` present — not abbonamento)
 * - not a closure-month cedolino (`caso_particolare === "Chiusura rapporto"`)
 */
export function isPagamentiReminderEligibleCard(card: PayrollBoardCardData): boolean {
  if (!card.transazione) return false
  if (isAbbonamentoCard(card)) return false
  if (normalizeCaseFlag(card.record.caso_particolare) === "chiusura") return false
  return true
}

/**
 * Rows Pagamenti lists at all: `stage === "Inviato cedolino"` AND eligible
 * for a payment reminder (R7 + BAZ-180). Derived from the SAME board columns
 * Controlli already receives (`usePayrollBoard`) so no extra board fetch is
 * needed.
 */
export function getPagamentiCandidateCards(
  columns: PayrollBoardColumnData[],
): PayrollBoardCardData[] {
  const cards: PayrollBoardCardData[] = []
  for (const column of columns) {
    if (column.id !== INVIATO_CEDOLINO_STAGE) continue
    for (const card of column.cards) {
      if (isPagamentiReminderEligibleCard(card)) cards.push(card)
    }
  }
  return cards
}

// --- Reminder da fare / fatti split -------------------------------------------

export type PagamentiSplit = {
  daFare: PayrollBoardCardData[]
  fatti: PayrollBoardCardData[]
}

/**
 * Splits candidate rows via `check_reminder_pagamento_inviato` (R7). This
 * flag is NOT returned by the `cedolini_board` RPC — callers pass a
 * `mese_lavorativo_id → boolean` map from a dedicated fetch
 * (`fetchCedoliniPagamentiReminderFlags`). A row absent from the map (flags
 * still loading) is treated as "da fare" — never optimistically shown as
 * already reminded.
 */
export function splitPagamentiCardsByReminderStatus(
  cards: PayrollBoardCardData[],
  reminderFlags: Map<string, boolean>,
): PagamentiSplit {
  const daFare: PayrollBoardCardData[] = []
  const fatti: PayrollBoardCardData[] = []
  for (const card of cards) {
    if (reminderFlags.get(card.id) === true) {
      fatti.push(card)
    } else {
      daFare.push(card)
    }
  }
  return { daFare, fatti }
}

// --- Date filter on data_invio_famiglia (AE6/OQ6) -----------------------------

/**
 * OQ6 resolution: with a filter set, a NULL `data_invio_famiglia` is
 * EXCLUDED (never assume "no send date" means "eligible"). Compares only the
 * date portion (`YYYY-MM-DD`) so an ISO timestamp with a time-of-day
 * component still compares correctly against a plain `<input type="date">`
 * value.
 */
export function isDataInvioFamigliaWithinDateFilter(
  dataInvioFamiglia: string | null,
  filterDate: string | null,
): boolean {
  if (!filterDate) return true
  if (!dataInvioFamiglia) return false
  return dataInvioFamiglia.slice(0, 10) <= filterDate
}

/**
 * Applies the date filter to a list of (already da fare/fatti-split) cards.
 * `filterDate` unset → returns all cards unchanged (AE6: "unset → bulk uses
 * all visible 'da fare'").
 */
export function filterPagamentiCardsByDate(
  cards: PayrollBoardCardData[],
  filterDate: string | null,
): PayrollBoardCardData[] {
  if (!filterDate) return cards
  return cards.filter((card) =>
    isDataInvioFamigliaWithinDateFilter(card.record.data_invio_famiglia, filterDate),
  )
}

// --- Bulk reminder ids (AE6 + BAZ-180 per-family exclusion) ------------------

/**
 * `mesi_lavorati.id` list for the bulk reminder job — call AFTER
 * `filterPagamentiCardsByDate`. `excludedIds` are operator deselections
 * (BAZ-180); default empty ⇒ all visible da-fare are included.
 */
export function getPagamentiReminderBulkIds(
  visibleDaFareCards: PayrollBoardCardData[],
  excludedIds: ReadonlySet<string> = new Set(),
): string[] {
  return visibleDaFareCards.filter((card) => !excludedIds.has(card.id)).map((card) => card.id)
}

/**
 * Toggle whether a visible da-fare card is included in the next bulk send.
 * `included: true` removes from exclusions; `false` adds.
 */
export function togglePagamentiReminderExclusion(
  excludedIds: ReadonlySet<string>,
  meseLavorativoId: string,
  included: boolean,
): Set<string> {
  const next = new Set(excludedIds)
  if (included) {
    next.delete(meseLavorativoId)
  } else {
    next.add(meseLavorativoId)
  }
  return next
}

// --- Dry-run outcome interpretation for kind: "reminder" ----------------------

/**
 * Dry-run SUCCESS for `kind: "reminder"`: the item status is `"success"`
 * (the job worker's `processReminderItem` only returns `"success"` when
 * `wk-reminder-pagamento` itself returned `{ success: true }` — see
 * `cedolini-bulk-job` edge function). Unlike `isSendDryRunSuccess` there is
 * no `details.updated` sub-field to check — `wk-reminder-pagamento`'s own
 * response shape is the source of truth and is NOT modified by this plan.
 * `"skipped"` (e.g. already-sent guard) / `"error"` fail the dry run so the
 * remainder never starts on a bad first pick, mirroring send's AE2.
 */
export function isReminderDryRunSuccess(outcome: CedolinoBulkJobDryRunOutcome | null): boolean {
  if (!outcome) return false
  return outcome.status === "success"
}
