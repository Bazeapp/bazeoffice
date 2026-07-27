/**
 * Pure classification helpers for the Cedolini Bulk Analyzer (BAZ-98 / BAZ-99 / BAZ-100).
 *
 * Runtime: `baze-supabase/.../_shared/cedolini-checks.ts` (Edge worker). Keep algorithms
 * in sync. Vitest suite of record: `cedolini-checks.test.ts` in this folder.
 *
 * No I/O here on purpose: everything in this file is a deterministic, synchronous function
 * of its inputs so it can be unit-tested without a database, storage bucket, or network
 * call. `cedolini-check-worker/index.ts` gathers the raw rows (mesi_lavorati,
 * rapporti_lavorativi, presenze_mensili, transazioni_finanziarie, PDF text) and calls
 * `classifyCedolinoChecks` with a plain-object snapshot of that data.
 *
 * Field-naming notes (see docs/plans/2026-07-21-001-feat-cedolini-bulk-analyzer-invio-plan.md
 * KTD9 and the bazeoffice `payroll-display-utils.ts` canon this mirrors):
 *   - Presence day columns are `evento_day_1..31` / `ore_day_1..31` on
 *     `presenze_mensili` (NOT `tipo_day_*`, which is the day *type* — festivo/
 *     lavorativo/non-lavorativo — and unrelated to these checks).
 *   - Event codes come from `PRESENCE_EVENT_OPTIONS` in payroll-display-utils.ts.
 */

/** PRD §6 warning buckets (fixed categories + "Altri" catch-all). */
export const WARNING_CATEGORIES = {
  PAGAMENTO_STRIPE: "Pagamento Stripe",
  ORE_NON_COERENTI: "Ore non coerenti",
  EVENTI_PRESENZE: "Eventi presenze",
  CEDOLINO_O_PDF: "Cedolino o PDF",
  PAGA_ORARIA: "Paga oraria",
  NOTE_CASI_PARTICOLARI: "Note/casi particolari",
  ALTRI: "Altri",
} as const

export type WarningCategory = (typeof WARNING_CATEGORIES)[keyof typeof WARNING_CATEGORIES]

/** Presenze event codes, matching bazeoffice `payroll-display-utils.ts` PRESENCE_EVENT_OPTIONS. */
export const PRESENZE_EVENT_CODES = {
  UNPAID_LEAVE: "unpaidLeave",
  PAID_LEAVE: "paidLeave",
  OVERTIME: "overtime",
  VACATION: "vacation",
  SICKNESS: "sickness",
} as const

// Events that count toward the worked-hours total (KTD9: "ordinary + overtime
// + paidLeave days only"). An "ordinary" day has no evento_day_* set at all.
const HOURS_COUNTED_EVENT_CODES: ReadonlySet<string> = new Set([
  PRESENZE_EVENT_CODES.OVERTIME,
  PRESENZE_EVENT_CODES.PAID_LEAVE,
])

// Events that surface an "Eventi presenze" warning regardless of whether the
// hours still reconcile (AE5 / plan U2 edge case: overtime → warning even if
// ore match). paidLeave is intentionally excluded — it only affects hours.
const WARNING_EVENT_CODES: ReadonlySet<string> = new Set([
  PRESENZE_EVENT_CODES.UNPAID_LEAVE,
  PRESENZE_EVENT_CODES.OVERTIME,
  PRESENZE_EVENT_CODES.VACATION,
  PRESENZE_EVENT_CODES.SICKNESS,
])

const MAX_PRESENCE_DAYS = 31

// Tolerances: paga oraria is a fixed-precision currency-like figure, so a
// tight tolerance is safe. Ore totals are cumulative sums across up to 31
// days pulled from two independently-entered sources (PDF text vs presenze
// form), so a slightly larger tolerance absorbs rounding without masking a
// real mismatch.
const PAGA_ORARIA_TOLERANCE = 0.01
const ORE_TOLERANCE = 0.5

export interface CedolinoWarning {
  category: WarningCategory
  message: string
  details?: Record<string, unknown>
}

export interface SumPresenzeOreResult {
  totaleOre: number
  eventiWarning: string[]
}

/**
 * Sums `ore_day_*` for days considered worked for payroll purposes (no event,
 * i.e. "ordinary", or `overtime` / `paidLeave`) and separately collects the
 * distinct event codes that should raise an "Eventi presenze" warning
 * (`unpaidLeave` / `overtime` / `vacation` / `sickness`).
 */
export function sumPresenzeOre(presenze: Record<string, unknown>): SumPresenzeOreResult {
  let totaleOre = 0
  const eventiWarning = new Set<string>()

  for (let day = 1; day <= MAX_PRESENCE_DAYS; day += 1) {
    const rawEvent = presenze[`evento_day_${day}`]
    const event = typeof rawEvent === "string" ? rawEvent.trim() : ""
    const isOrdinary = event === ""

    if (isOrdinary || HOURS_COUNTED_EVENT_CODES.has(event)) {
      const hours = Number(presenze[`ore_day_${day}`])
      if (Number.isFinite(hours)) {
        totaleOre += hours
      }
    }

    if (WARNING_EVENT_CODES.has(event)) {
      eventiWarning.add(event)
    }
  }

  return { totaleOre, eventiWarning: Array.from(eventiWarning) }
}

/** Compares PDF-extracted hourly wage against `rapporti_lavorativi.paga_oraria_lorda`. */
export function comparePaga(
  pdfPaga: number | null,
  rapportoPaga: number | null,
): CedolinoWarning | null {
  if (pdfPaga == null || rapportoPaga == null) return null

  const diff = Math.abs(pdfPaga - rapportoPaga)
  if (diff <= PAGA_ORARIA_TOLERANCE) return null

  return {
    category: WARNING_CATEGORIES.PAGA_ORARIA,
    message:
      `Paga oraria sul cedolino (${pdfPaga}) diversa da quella del rapporto ` +
      `(${rapportoPaga}).`,
    details: { pdf_paga_oraria: pdfPaga, rapporto_paga_oraria: rapportoPaga, diff },
  }
}

/** Compares PDF-extracted total hours against the presenze-derived total. */
export function compareOre(
  pdfTotale: number | null,
  presenzeTotale: number | null,
): CedolinoWarning | null {
  if (pdfTotale == null || presenzeTotale == null) return null

  const diff = Math.abs(pdfTotale - presenzeTotale)
  if (diff <= ORE_TOLERANCE) return null

  return {
    category: WARNING_CATEGORIES.ORE_NON_COERENTI,
    message:
      `Totale ore sul cedolino (${pdfTotale}) diverso dal totale presenze ` +
      `(${presenzeTotale}).`,
    details: { pdf_totale_ore: pdfTotale, presenze_totale_ore: presenzeTotale, diff },
  }
}

/**
 * Baze Pay ⇔ has a `richiesta_attivazione` OR a linked `transazioni_finanziarie`
 * row (KTD6). Abbonamento rapporti skip the Stripe/payment-link check entirely.
 * If the two signals disagree, KTD6 says to treat it as Baze Pay (OR, not AND).
 */
export function isBazePay(input: {
  richiestaAttivazioneId: string | null | undefined
  hasTransazione: boolean
}): boolean {
  return Boolean(input.richiestaAttivazioneId) || Boolean(input.hasTransazione)
}

export interface PaymentUrlCheckResult {
  ok: boolean
  http_status: number | null
  final_url: string | null
  reason: string | null
}

/**
 * Classifies an already-fetched read-only payment-link probe result (KTD7).
 * The actual HTTP fetch/redirect-following happens in the worker (I/O) this
 * function only decides ok/warning from the structured outcome.
 */
export function evaluatePaymentUrlResult(
  result: PaymentUrlCheckResult,
): CedolinoWarning | null {
  const httpFailed = result.http_status != null && result.http_status >= 400
  if (!result.ok || httpFailed) {
    return {
      category: WARNING_CATEGORIES.PAGAMENTO_STRIPE,
      message: result.reason
        ? `Link di pagamento non valido: ${result.reason}.`
        : "Link di pagamento non valido o non raggiungibile.",
      details: { ...result },
    }
  }
  return null
}

export interface CedolinoPdfFields {
  paga_oraria: number | null
  ore_ordinarie: number | null
  ore_straordinarie: number | null
  permessi_retribuiti: number | null
  totale_ore: number | null
}

export interface ClassifyChecksInput {
  /** Fields extracted from the cedolino PDF text, or null when nothing was extracted. */
  pdfFields: CedolinoPdfFields | null
  /** Whether PDF text extraction ran without throwing (independent of field coverage). */
  pdfExtractOk: boolean
  /** Whether `mesi_lavorati.cedolino` has at least one attachment. */
  hasCedolinoAttachment: boolean
  /** `mesi_lavorati.cedolino_url`, if any. */
  cedolinoUrl: string | null
  /** `rapporti_lavorativi.paga_oraria_lorda`. */
  rapportoPagaOraria: number | null
  /** Raw `presenze_mensili` row (or `{}` when absent) feeding `sumPresenzeOre`. */
  presenze: Record<string, unknown>
  casoParticolare?: string | null
  note?: string | null
  /** Result of `isBazePay(...)` — gates the payment-link check. */
  isBazePayFlag: boolean
  /** Only read when `isBazePayFlag` is true. */
  paymentUrlResult?: PaymentUrlCheckResult | null
  /**
   * Set by the worker when a hard failure (DB fetch error, missing
   * mesi_lavorativo, etc.) prevented running the checks at all. When present,
   * short-circuits to status "error" instead of "warning"/"ok".
   */
  criticalError?: string | null
}

export interface ClassifyChecksResult {
  status: "ok" | "warning" | "error"
  warnings: CedolinoWarning[]
  details: Record<string, unknown>
}

/**
 * Mirrors bazeoffice `normalizeCaseFlag` in `cedolini-filters.ts`.
 * Only "si" / "caso particolare" (and synonyms) raise Note/casi particolari.
 * "no" / empty / "chiusura rapporto" do not (chiusura is excluded at enqueue).
 */
function isCasoParticolareWarning(value: string | null | undefined): boolean {
  const token = String(value ?? "").trim().toLowerCase()
  if (!token) return false
  return ["si", "sì", "yes", "true", "caso particolare"].includes(token)
}

function evaluateCedolinoPdfCheck(input: ClassifyChecksInput): CedolinoWarning | null {
  if (!input.hasCedolinoAttachment && !input.cedolinoUrl) {
    return {
      category: WARNING_CATEGORIES.CEDOLINO_O_PDF,
      message: "Nessun cedolino allegato e nessun cedolino_url disponibile.",
    }
  }

  if (!input.pdfExtractOk) {
    return {
      category: WARNING_CATEGORIES.CEDOLINO_O_PDF,
      message: "PDF non leggibile: estrazione del testo non riuscita.",
    }
  }

  const fields = input.pdfFields
  if (!fields || fields.paga_oraria == null || fields.totale_ore == null) {
    return {
      category: WARNING_CATEGORIES.CEDOLINO_O_PDF,
      message: "Campi cedolino non estratti dal PDF (paga oraria o totale ore mancanti).",
      details: { pdf_fields: fields },
    }
  }

  return null
}

/**
 * Runs the five independent checks (PDF/cedolino readability, paga oraria,
 * ore vs presenze, eventi presenze, payment link when Baze Pay) and ANDs
 * them into a single status per PRD R2: any failing check ⇒ "warning".
 */
export function classifyCedolinoChecks(input: ClassifyChecksInput): ClassifyChecksResult {
  if (input.criticalError) {
    return {
      status: "error",
      warnings: [{ category: WARNING_CATEGORIES.ALTRI, message: input.criticalError }],
      details: { critical_error: input.criticalError },
    }
  }

  const warnings: CedolinoWarning[] = []
  const { totaleOre, eventiWarning } = sumPresenzeOre(input.presenze ?? {})

  const pdfWarning = evaluateCedolinoPdfCheck(input)
  if (pdfWarning) warnings.push(pdfWarning)

  const pagaWarning = comparePaga(input.pdfFields?.paga_oraria ?? null, input.rapportoPagaOraria)
  if (pagaWarning) warnings.push(pagaWarning)

  const oreWarning = compareOre(input.pdfFields?.totale_ore ?? null, totaleOre)
  if (oreWarning) warnings.push(oreWarning)

  if (eventiWarning.length > 0) {
    warnings.push({
      category: WARNING_CATEGORIES.EVENTI_PRESENZE,
      message: `Eventi presenza da verificare: ${eventiWarning.join(", ")}.`,
      details: { eventi: eventiWarning },
    })
  }

  if (input.isBazePayFlag) {
    const paymentResult: PaymentUrlCheckResult = input.paymentUrlResult ?? {
      ok: false,
      http_status: null,
      final_url: null,
      reason: "missing_payment_link",
    }
    const paymentWarning = evaluatePaymentUrlResult(paymentResult)
    if (paymentWarning) warnings.push(paymentWarning)
  }

  if (isCasoParticolareWarning(input.casoParticolare)) {
    warnings.push({
      category: WARNING_CATEGORIES.NOTE_CASI_PARTICOLARI,
      message: `Caso particolare segnalato: ${input.casoParticolare}.`,
      details: { caso_particolare: input.casoParticolare, note: input.note ?? null },
    })
  }

  return {
    status: warnings.length > 0 ? "warning" : "ok",
    warnings,
    details: {
      pdf: input.pdfFields,
      presenze: { totale_ore: totaleOre, eventi: eventiWarning },
      rapporto_paga_oraria: input.rapportoPagaOraria,
      is_baze_pay: input.isBazePayFlag,
      payment: input.isBazePayFlag ? input.paymentUrlResult ?? null : null,
    },
  }
}
