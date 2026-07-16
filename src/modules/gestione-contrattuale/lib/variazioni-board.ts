import { preserveMissingFields } from "@/lib/board-column-utils"
import { formatItalianDate, toStringValue } from "@/lib/value-utils"
import { getRapportoTitle, personNameFromRow } from "@/modules/rapporti/lib"
import type { RapportoAssunzioneNames } from "../types/gestione-rpc"
import type { VariazioniBoardCardData } from "../types"
import type { RapportoLavorativoRecord, VariazioneContrattualeRecord } from "@/types"

type GenericRow = Record<string, unknown>

export type VariazioneBoardRow = {
  record: VariazioneContrattualeRecord
  rapporto?: RapportoLavorativoRecord | null
  famiglia?: GenericRow | null
  lavoratore?: GenericRow | null
  lavoratoreAddress?: GenericRow | null
}

/**
 * Pattern A field bindings — see `docs/realtime-board-pattern.md`.
 *
 * The Variazioni board has a "narrow board fetch + separate detail loader +
 * shared cache" shape (`variazioni-board-view.tsx` writes detail results
 * back into the board's React Query cache via `updateCard`). Without
 * preservation, a board refetch triggered by realtime would blank out every
 * column the board RPC does NOT return (but the detail RPC does).
 *
 * The variazione card stores two sub-source rows as full objects: `record`
 * (variazioni_contrattuali row) and `rapporto` (rapporti_lavorativi row).
 * The bindings below are the column names within each sub-source that need
 * preservation when the column is absent from the fresh board payload.
 *
 * Treatment mirrors `preserveMissingFields`: if `column in freshRow` is
 * false, restore previous; if the column is present (even when null),
 * fresh wins so DB clears propagate.
 */
export const VARIAZIONE_RECORD_FIELD_BINDINGS: ReadonlyArray<
  keyof VariazioneContrattualeRecord
> = [
  "accordo_variazione_contrattuale",
  "data_variazione",
  "rapporto_lavorativo_id",
  "ricevuta_inps_variazione_rapporto",
  "stato",
  "ticket_id",
  "variazione_da_applicare",
  "airtable_id",
  "airtable_record_id",
  "creato_il",
  "aggiornato_il",
  "metadati_migrazione",
] as const

export const VARIAZIONE_RAPPORTO_FIELD_BINDINGS: ReadonlyArray<
  keyof RapportoLavorativoRecord
> = [
  "stato_assunzione",
  "stato_servizio",
  "fine_rapporto_lavorativo_id",
  "tipo_rapporto",
  "tipo_contratto",
  "ore_a_settimana",
  "paga_oraria_lorda",
  "data_inizio_rapporto",
  "cognome_nome_datore_proper",
  "famiglia_id",
  "lavoratore_id",
  "nome_lavoratore_per_url",
  "aggiornato_il",
] as const

/**
 * For each binding column, if the column is NOT present in `freshRow`,
 * restore the value from `previousRow`. Mutates `targetRow` in place. If
 * `freshRow` is missing entirely, every bound column falls back to
 * `previousRow`. See `@/lib/board-column-utils` (Pattern A).
 *
 * @deprecated Import `preserveMissingFields` from `@/lib/board-column-utils`.
 */
export { preserveMissingFields } from "@/lib/board-column-utils"

function formatAddressLabel(address: GenericRow | null | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  const street = [toStringValue(address.via), toStringValue(address.civico)]
    .filter(Boolean)
    .join(" ")
    .trim()
  const note = toStringValue(address.note)
  const citta = toStringValue(address.citta)
  const provincia = toStringValue(address.provincia)
  const cap = toStringValue(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [street || shortNote, citta, provincia, cap]
      .filter(
        (value, index, values): value is string =>
          Boolean(value) && values.indexOf(value) === index
      )
      .join(" • ") || null
  )
}

function getAddressCap(address: GenericRow | null | undefined) {
  return toStringValue(address?.cap)
}

/**
 * Map a board row to a card. If `previousCard` is provided, columns of
 * `record` and `rapporto` that are absent from the fresh board payload are
 * restored from the previous card. This is Pattern A — see
 * `docs/realtime-board-pattern.md`.
 */
export function mapVariazioneBoardCard(
  row: VariazioneBoardRow,
  stage: string,
  previousCard?: VariazioniBoardCardData,
  assunzioneNames?: RapportoAssunzioneNames | null,
): VariazioniBoardCardData {
  const freshRecord = row.record
  const freshRapporto = row.rapporto ?? null
  const famiglia = (row.famiglia as GenericRow | null) ?? null
  const baseLavoratore = (row.lavoratore as GenericRow | null) ?? null
  const resolvedWorkerAddress =
    (row.lavoratoreAddress as GenericRow | null) ?? null
  const workerAddress = formatAddressLabel(resolvedWorkerAddress)
  const workerAddressCap = getAddressCap(resolvedWorkerAddress)
  const lavoratore = baseLavoratore
    ? {
        ...baseLavoratore,
        indirizzo_residenza_completo: workerAddress,
        cap: workerAddressCap,
      }
    : null

  // Merge missing columns from previous card's record/rapporto into the
  // fresh row objects. Shallow clones so we don't mutate the RPC response.
  const record = { ...freshRecord } as VariazioneContrattualeRecord
  if (previousCard) {
    preserveMissingFields(
      record as unknown as Record<string, unknown>,
      previousCard.record as unknown as Record<string, unknown>,
      freshRecord as unknown as Record<string, unknown>,
      VARIAZIONE_RECORD_FIELD_BINDINGS as ReadonlyArray<string>,
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
        VARIAZIONE_RAPPORTO_FIELD_BINDINGS as ReadonlyArray<string>,
      )
      rapporto = merged
    } else if (!freshRapporto && previousCard.rapporto) {
      // Board fetch dropped the rapporto entirely — keep the previously
      // known one so the detail panel doesn't blank out.
      rapporto = previousCard.rapporto
    }
  }

  const nomeCompleto = rapporto
    ? getRapportoTitle(rapporto, {
        famiglia: personNameFromRow(famiglia),
        lavoratore: personNameFromRow(baseLavoratore),
        assunzioneDatore: assunzioneNames?.datore,
        assunzioneLavoratore: assunzioneNames?.lavoratore,
      })
    : "Rapporto non disponibile"

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    famiglia,
    lavoratore,
    nomeCompleto,
    dataVariazione: formatItalianDate(record.data_variazione),
    variazioneDaApplicare: record.variazione_da_applicare,
  }
}
