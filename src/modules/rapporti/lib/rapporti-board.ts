import type { RapportoLavorativoRecord } from "@/types"

/**
 * Bindings between source DB/RPC columns and the card fields they populate
 * on a board row.
 *
 * The board RPC `rapporti_lavorativi_board` enriches each rapporto with:
 *   - `cognome_nome_datore_proper`  (joined from `famiglie`)
 *   - `nome_lavoratore_per_url`     (overridden with `lavoratori.cognome nome`)
 *   - `data_fine_rapporto`          (joined from `chiusure_contratti`)
 *   - `stato_rapporto`              (computed: In attivazione / Attivo / Terminato / …)
 */
export const RAPPORTO_FIELD_BINDINGS: Array<
  readonly [string, keyof RapportoLavorativoRecord]
> = [
  ["cognome_nome_datore_proper", "cognome_nome_datore_proper"],
  ["nome_lavoratore_per_url", "nome_lavoratore_per_url"],
  ["data_fine_rapporto", "data_fine_rapporto"],
  ["stato_rapporto", "stato_rapporto"],
]

export function preserveMissingFields<TCard extends Record<string, unknown>>(
  card: TCard,
  previousCard: TCard,
  row: Record<string, unknown> | undefined | null,
  bindings: Array<readonly [string, keyof TCard]>,
) {
  for (const [column, field] of bindings) {
    if (row && column in row) continue
    ;(card as Record<string, unknown>)[field as string] = previousCard[field]
  }
}

export function mapRapportoBoardRow(
  row: RapportoLavorativoRecord,
  previousCard?: RapportoLavorativoRecord,
): RapportoLavorativoRecord {
  const card: RapportoLavorativoRecord = { ...row }
  if (previousCard) {
    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previousCard as unknown as Record<string, unknown>,
      row as unknown as Record<string, unknown>,
      RAPPORTO_FIELD_BINDINGS as unknown as Array<
        readonly [string, keyof Record<string, unknown>]
      >,
    )
  }
  return card
}
