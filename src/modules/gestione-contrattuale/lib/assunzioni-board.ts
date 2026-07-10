import { formatAssunzioneName, formatPersonName } from "@/modules/rapporti/lib"
import { formatItalianDate, getFirstArrayValue, toStringValue } from "@/lib/value-utils"

import type { AssunzioniBoardRpcRow } from "../types/gestione-rpc"
import type { AssunzioneRecord, AssunzioniBoardCardData } from "../types"
import type { RapportoLavorativoRecord } from "@/types"

/**
 * Pattern A bindings (see docs/realtime-board-pattern.md).
 *
 * The board RPC `assunzioni_board` returns four sub-objects per card —
 * `rapporto`, `assunzione`, `lavoratoreAssunzione`, `richiestaAttivazione` —
 * but with a NARROWER column projection than `assunzione_detail`. When the
 * detail loader merges the rich sub-objects into the board cache and a
 * realtime invalidate refetches the board, the columns the board RPC omits
 * are blanked → the open detail panel visibly empties out.
 *
 * Each binding list enumerates the DB columns that the detail RPC returns
 * for that sub-object. The mapper preserves any column that is *not present*
 * in the fresh board sub-row by copying it from the previous card. Present
 * columns (even `null`) win — clearing in DB still propagates.
 *
 * `richiestaAttivazione` is special: the board RPC does NOT include it at
 * all (`card.richiestaAttivazione` is always `null` post-board-refetch). The
 * bindings still drive a per-column restore so partial future board RPCs
 * (e.g. only `id` returned) would still preserve the rest.
 */
export const RAPPORTO_FIELD_BINDINGS: readonly string[] = [
  "id",
  "stato_assunzione",
  "tipo_rapporto",
  "tipo_contratto",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
  "codice_datore_webcolf",
  "codice_dipendente_webcolf",
  "id_rapporto",
  "data_inizio_rapporto",
  "data_fine_rapporto",
  "data_assunzione",
]

export const ASSUNZIONE_FIELD_BINDINGS: readonly string[] = [
  "id",
  "creato_il",
  "delega_inps_allegati",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
  "famiglia_id",
  "cittadino_extracomunitario",
  "info_anagrafiche_cap",
  "info_anagrafiche_cittadidanza",
  "info_anagrafiche_civico",
  "info_anagrafiche_codice_fiscale",
  "info_anagrafiche_cognome",
  "info_anagrafiche_data_di_nascita",
  "info_anagrafiche_email",
  "info_anagrafiche_indirizzo",
  "info_anagrafiche_localita",
  "info_anagrafiche_luogo_di_nascita",
  "info_anagrafiche_nome",
  "info_anagrafiche_numero_fisso",
  "info_anagrafiche_numero_mobile",
  "luogo_lavoro_se_diverso_da_residenza",
  "mansione_lavoratore",
  "mezza_giornata_di_riposo",
  "ore_di_lavoro",
  "ore_giovedi",
  "ore_lunedi",
  "ore_martedi",
  "ore_mercoledi",
  "ore_sabato",
  "ore_venerdi",
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "lavoratore_id",
  "regime_convivenza",
  "ricevuta_rinnovo_permesso_allegati",
  "telecamere_posto_lavoro",
  "tredicesima_rateizzata_mensile",
  "note_aggiuntive",
  "data_assunzione",
  "type_of_compilazione_form",
]

// Same DB shape as ASSUNZIONE_FIELD_BINDINGS — the `lavoratoreAssunzione`
// sub-object reuses the AssunzioneRecord type. Exported separately so future
// divergence between the two sub-objects (e.g. lavoratore-only columns) can
// be expressed without rewriting callers.
export const LAVORATORE_ASSUNZIONE_FIELD_BINDINGS: readonly string[] = [
  ...ASSUNZIONE_FIELD_BINDINGS,
]

export const RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS: readonly string[] = [
  "id",
  "data_submission",
  "email",
  "fee_concordata",
  "processo_res_id",
  "signed_document_title",
  "signed_document_url",
  "airtable_id",
  "airtable_record_id",
  "creato_il",
  "aggiornato_il",
  "metadati_migrazione",
]

/**
 * Sub-object preservation. For every column in `columns`, if the column is
 * NOT present in `fresh`, restore it from `previous`. Returns a NEW object
 * (does not mutate `fresh`).
 *
 * Treatment of nulls:
 * - `fresh === null` (sub-object entirely absent from board row) → return
 *   `previous` as-is. This is the common case for `richiestaAttivazione`,
 *   which the board RPC omits entirely.
 * - `fresh` is an object, column absent (`!(column in fresh)`) → copy from
 *   `previous`.
 * - `fresh` is an object, column present with any value (including `null`)
 *   → keep fresh value (clearing in DB propagates).
 */
export function preserveMissingFields<T extends Record<string, unknown>>(
  fresh: T | null,
  previous: T | null,
  columns: readonly string[],
): T | null {
  if (!previous) return fresh
  if (!fresh) return previous
  const merged: Record<string, unknown> = { ...fresh }
  for (const column of columns) {
    if (column in fresh) continue
    if (column in previous) {
      merged[column] = (previous as Record<string, unknown>)[column]
    }
  }
  return merged as T
}

/**
 * Build the board card. When `previousCard` is provided, missing columns
 * inside each detail-only sub-object are restored from the previous card.
 *
 * Card-derived fields (`nomeFamiglia`, `nomeLavoratore`, `email`,
 * `telefono`, `titoloAnnuncio`, `tipoRapporto`, `deadline`) are recomputed
 * from the merged sub-objects so they stay consistent.
 */
export function mapAssunzioniBoardCard(
  row: AssunzioniBoardRpcRow,
  processStage: string,
  previousCard?: AssunzioniBoardCardData,
): AssunzioniBoardCardData | null {
  const linkedRapporto = row.rapporto
  if (!linkedRapporto) return null

  const process = row.process ?? null
  const family = row.famiglia ?? null
  const lavoratore = row.lavoratore ?? null
  const datoreAssunzioneFresh = (row.assunzione as AssunzioneRecord | null) ?? null
  const lavoratoreAssunzioneFresh =
    (row.lavoratoreAssunzione as AssunzioneRecord | null) ?? null

  // The board RPC does not return `richiestaAttivazione`, so always start
  // from `null` and let preserveMissingFields restore the previous value.
  const richiestaAttivazioneFresh = null

  const datoreAssunzione = previousCard
    ? preserveMissingFields(
        datoreAssunzioneFresh,
        previousCard.assunzione,
        ASSUNZIONE_FIELD_BINDINGS,
      )
    : datoreAssunzioneFresh
  const lavoratoreAssunzione = previousCard
    ? preserveMissingFields(
        lavoratoreAssunzioneFresh,
        previousCard.lavoratoreAssunzione,
        LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
      )
    : lavoratoreAssunzioneFresh
  const richiestaAttivazione = previousCard
    ? preserveMissingFields(
        richiestaAttivazioneFresh,
        previousCard.richiestaAttivazione,
        RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
      )
    : richiestaAttivazioneFresh
  const rapporto = previousCard
    ? preserveMissingFields(
        linkedRapporto as unknown as Record<string, unknown>,
        previousCard.rapporto as unknown as Record<string, unknown> | null,
        RAPPORTO_FIELD_BINDINGS,
      )
    : linkedRapporto

  const mergedRapporto = (rapporto ?? linkedRapporto) as RapportoLavorativoRecord
  const nomeFamiglia =
    formatAssunzioneName(datoreAssunzione) ??
    formatPersonName(family) ??
    toStringValue(mergedRapporto.cognome_nome_datore_proper)
  const nomeLavoratore =
    formatAssunzioneName(lavoratoreAssunzione) ??
    formatPersonName(lavoratore) ??
    toStringValue(mergedRapporto.nome_lavoratore_per_url)

  return {
    id: linkedRapporto.id,
    processId: process?.id ?? null,
    stage: processStage,
    process,
    assunzione: datoreAssunzione,
    lavoratoreAssunzione,
    richiestaAttivazione,
    rapporto: mergedRapporto,
    lavoratore,
    famiglia: family,
    famigliaId: family?.id ?? process?.famiglia_id ?? null,
    nomeFamiglia: nomeFamiglia ?? "Famiglia non trovata",
    nomeLavoratore: nomeLavoratore ?? "Lavoratore non associato",
    email: family?.email ?? "-",
    telefono: family?.telefono ?? "-",
    titoloAnnuncio: process?.titolo_annuncio ?? null,
    tipoRapporto:
      mergedRapporto?.tipo_rapporto ?? getFirstArrayValue(process?.tipo_rapporto),
    deadline: formatItalianDate(process?.data_limite_invio_selezione),
  }
}
