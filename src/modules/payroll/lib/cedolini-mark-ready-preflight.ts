/**
 * Pure mark-ready preflight helpers (BAZ-98/99/100 U3, KTD3/KTD10).
 *
 * Runtime Edge Function: `baze-supabase/.../_shared/cedolini-mark-ready.ts`
 * (includes the DB conditional UPDATE). Keep the pure preflight logic in sync.
 * Vitest suite of record: `cedolini-mark-ready-preflight.test.ts` in this folder.
 */

export const MARK_READY_TABLE = "mesi_lavorati"
export const MARK_READY_FROM_STATO = "Cedolino da controllare"
export const MARK_READY_TO_STATO = "Cedolino Pronto"

/** Exact strings `trg_wk_invio_cedolino` excludes (matches the DB trigger's WHEN clause). */
export const EXCLUDED_CASO_PARTICOLARE = ["Tredicesima", "Chiusura rapporto"] as const

export type MarkReadySkipReason =
  | "not_found"
  | "missing_cedolino"
  | "missing_mese_id"
  | "excluded_caso_particolare"

export interface MeseLavorativoPreflightInput {
  cedolino: unknown
  mese_id: string | null
  caso_particolare: string | null
}

export interface MarkReadyPreflightResult {
  ok: boolean
  reason?: MarkReadySkipReason
  message?: string
}

/**
 * True when `cedolino` looks like the trigger's `cedolino IS NOT NULL` guard
 * would be satisfied by a *usable* attachment — mirrors the
 * `cedolinoHasFirstItem` guard in `wk-reminder-pagamento/index.ts`.
 */
export function hasCedolinoAttachment(cedolino: unknown): boolean {
  return Array.isArray(cedolino) && cedolino.length > 0 && Boolean(cedolino[0])
}

/**
 * Free-text tolerant match against the trigger's excluded
 * `caso_particolare` values. Mirrors bazeoffice `normalizeCaseFlag`
 * (`src/modules/payroll/lib/cedolini-filters.ts`) for casing/whitespace
 * tolerance, extended with the "Tredicesima" case the trigger also excludes
 * (which `normalizeCaseFlag` does not need to distinguish from "si").
 */
export function isExcludedCasoParticolare(value: string | null | undefined): boolean {
  const token = String(value ?? "").trim().toLowerCase()
  if (!token) return false
  return EXCLUDED_CASO_PARTICOLARE.some((excluded) => excluded.toLowerCase() === token)
}

/** KTD10 preflight — fail-fast before ever attempting the conditional UPDATE. */
export function preflightMarkReady(mese: MeseLavorativoPreflightInput): MarkReadyPreflightResult {
  if (!hasCedolinoAttachment(mese.cedolino)) {
    return {
      ok: false,
      reason: "missing_cedolino",
      message: "Nessun cedolino allegato: il mark-ready non attiverebbe l'invio automatico.",
    }
  }
  if (!mese.mese_id) {
    return {
      ok: false,
      reason: "missing_mese_id",
      message: "mese_id mancante: il mark-ready non attiverebbe l'invio automatico.",
    }
  }
  if (isExcludedCasoParticolare(mese.caso_particolare)) {
    return {
      ok: false,
      reason: "excluded_caso_particolare",
      message: `Caso particolare "${mese.caso_particolare}" escluso dall'invio automatico.`,
    }
  }
  return { ok: true }
}

export interface MarkReadyResult {
  updated: boolean
  skipped?: boolean
  reason?: MarkReadySkipReason
  message?: string
}

/** Small factory so every code path returns the exact same result shape. */
export function buildMarkReadyResult(params: {
  updated: boolean
  skipped?: boolean
  reason?: MarkReadySkipReason
  message?: string
}): MarkReadyResult {
  const { updated, skipped, reason, message } = params
  const result: MarkReadyResult = { updated }
  if (skipped) result.skipped = true
  if (reason) result.reason = reason
  if (message) result.message = message
  return result
}

export interface MarkReadyUpdateFilterDescription {
  table: string
  idColumn: string
  setColumn: string
  toValue: string
  whereColumn: string
  whereValue: string
}

/**
 * Documents (and lets tests assert on, without a live Supabase client) the
 * exact conditional-UPDATE shape `markCedolinoReady` issues:
 *   UPDATE mesi_lavorati SET stato_mese_lavorativo = 'Cedolino Pronto'
 *   WHERE id = $1 AND stato_mese_lavorativo = 'Cedolino da controllare'
 *   RETURNING id
 */
export function describeMarkReadyUpdateFilter(): MarkReadyUpdateFilterDescription {
  return {
    table: MARK_READY_TABLE,
    idColumn: "id",
    setColumn: "stato_mese_lavorativo",
    toValue: MARK_READY_TO_STATO,
    whereColumn: "stato_mese_lavorativo",
    whereValue: MARK_READY_FROM_STATO,
  }
}
