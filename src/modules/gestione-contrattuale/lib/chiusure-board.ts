import { getRapportoTitle } from "@/modules/rapporti/lib"
import type { RapportoAssunzioneNames } from "../types/gestione-rpc"
import type { ChiusureBoardCardData, TipoLicenziamentoOption } from "../types"
import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

export type ChiusuraTipoMetadata = {
  labels: Map<string, string>
  colors: Map<string, string>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
}

export type ChiusuraBoardRow = {
  record: ChiusuraContrattoRecord
  rapporto?: RapportoLavorativoRecord | null
  famiglia?: { cognome: string | null; nome: string | null } | null
  lavoratore?: { cognome: string | null; nome: string | null } | null
}

/**
 * Pattern A field bindings — see `docs/realtime-board-pattern.md`.
 *
 * The Chiusure board has a "narrow board fetch + separate detail loader +
 * shared cache" shape (chiusure-board-view.tsx writes detail results back
 * into the board's React Query cache via `updateCard`). Without preservation,
 * a board refetch triggered by realtime would blank out every column that
 * the board RPC does NOT return (but the detail RPC does).
 *
 * The chiusura card stores two sub-source rows as full objects: `record`
 * (chiusure_contratti row) and `rapporto` (rapporti_lavorativi row). The
 * bindings below are the column names within each sub-source that need
 * preservation when the column is absent from the fresh board payload.
 *
 * Treatment mirrors `preserveMissingFields`: if `column in freshRow` is
 * false, restore previous; if the column is present (even when null),
 * fresh wins so DB clears propagate.
 */
export const CHIUSURA_RECORD_FIELD_BINDINGS: ReadonlyArray<
  keyof ChiusuraContrattoRecord
> = [
  "motivazione_cessazione_rapporto",
  "data_fine_rapporto",
  "tipo_licenziamento",
  "tipo_decesso",
  "email",
  "nome",
  "cognome",
  "informazioni_aggiuntive",
  "stato",
] as const

export const CHIUSURA_RAPPORTO_FIELD_BINDINGS: ReadonlyArray<
  keyof RapportoLavorativoRecord
> = [
  "assunzione_datore_id",
  "assunzione_lavoratore_id",
  "fine_rapporto_lavorativo_id",
  "data_inizio_rapporto",
  "data_fine_rapporto",
  "stato_rapporto",
] as const

/**
 * For each binding column, if the column is NOT present in `freshRow`,
 * restore the value from `previousRow`. Mutates `targetRow` in place. If
 * `freshRow` is missing entirely, every bound column falls back to
 * `previousRow`. Mirrors the helper of the same name in
 * `use-crm-pipeline-preview.ts` (Pattern A reference).
 */
export function preserveMissingFields<T extends Record<string, unknown>>(
  targetRow: T,
  previousRow: T | undefined | null,
  freshRow: Record<string, unknown> | undefined | null,
  columns: ReadonlyArray<keyof T>,
) {
  if (!previousRow) return
  for (const column of columns) {
    if (freshRow && (column as string) in freshRow) continue
    ;(targetRow as Record<string, unknown>)[column as string] =
      previousRow[column]
  }
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

export function formatChiusuraBoardDate(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

/**
 * Map a board row to a card. If `previousCard` is provided, columns of
 * `record` and `rapporto` that are absent from the fresh board payload are
 * restored from the previous card. This is Pattern A — see
 * `docs/realtime-board-pattern.md`.
 */
export function mapChiusuraBoardCard(
  row: ChiusuraBoardRow,
  stage: string,
  tipoMetadata: ChiusuraTipoMetadata,
  previousCard?: ChiusureBoardCardData,
  assunzioneNames?: RapportoAssunzioneNames | null,
): ChiusureBoardCardData {
  const freshRecord = row.record
  const freshRapporto = row.rapporto ?? null

  // Merge missing columns from previous card's record/rapporto into the
  // fresh row objects. We mutate shallow clones so we don't mutate the RPC
  // response.
  const record = { ...freshRecord } as ChiusuraContrattoRecord
  if (previousCard) {
    preserveMissingFields(
      record as unknown as Record<string, unknown>,
      previousCard.record as unknown as Record<string, unknown>,
      freshRecord as unknown as Record<string, unknown>,
      CHIUSURA_RECORD_FIELD_BINDINGS as ReadonlyArray<string>,
    )
  }

  let rapporto: RapportoLavorativoRecord | null = freshRapporto
  if (previousCard) {
    if (freshRapporto && previousCard.rapporto) {
      const merged = { ...freshRapporto } as RapportoLavorativoRecord
      preserveMissingFields(
        merged as unknown as Record<string, unknown>,
        previousCard.rapporto as unknown as Record<string, unknown>,
        freshRapporto as unknown as Record<string, unknown>,
        CHIUSURA_RAPPORTO_FIELD_BINDINGS as ReadonlyArray<string>,
      )
      rapporto = merged
    } else if (!freshRapporto && previousCard.rapporto) {
      // Board fetch dropped the rapporto entirely (e.g. RPC returns no
      // rapporto join). Keep the previously known one so the detail panel
      // doesn't blank out — a subsequent invalidate with rapporto present
      // will overwrite cleanly.
      rapporto = previousCard.rapporto
    }
  }

  const nomeCompleto =
    (rapporto
      ? getRapportoTitle(rapporto, {
          famiglia: row.famiglia ? { cognome: row.famiglia.cognome, nome: row.famiglia.nome } : null,
          lavoratore: row.lavoratore ? { cognome: row.lavoratore.cognome, nome: row.lavoratore.nome } : null,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        })
      : null) ||
    [record.nome, record.cognome].filter(Boolean).join(" ").trim() ||
    "Nominativo non disponibile"
  const rawTipo = record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
  const normalizedTipo = normalizeToken(rawTipo)

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    nomeCompleto,
    email: record.email ?? "-",
    motivazione: record.motivazione_cessazione_rapporto,
    dataFineRapporto: formatChiusuraBoardDate(record.data_fine_rapporto),
    tipoLabel: tipoMetadata.labels.get(normalizedTipo) ?? rawTipo,
    tipoColor: tipoMetadata.colors.get(normalizedTipo) ?? null,
    hasAssunzioneDatore: Boolean(rapporto?.assunzione_datore_id),
    hasAssunzioneLavoratore: Boolean(rapporto?.assunzione_lavoratore_id),
  }
}
