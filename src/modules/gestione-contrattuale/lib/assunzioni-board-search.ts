import { matchesSearchQuery } from "@/lib/search-utils"

import type {
  AssunzioniBoardCardData,
  AssunzioniBoardColumnData,
} from "../types"

export function getAssunzioniCardSearchFields(card: AssunzioniBoardCardData): unknown[] {
  return [
    card.id,
    card.processId,
    card.nomeFamiglia,
    card.nomeLavoratore,
    card.email,
    card.telefono,
    card.titoloAnnuncio,
    card.tipoRapporto,
    card.rapporto?.id_rapporto,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
    card.rapporto?.codice_datore_webcolf,
    card.rapporto?.codice_dipendente_webcolf,
  ]
}

export function filterAssunzioniBoardColumns(
  columns: AssunzioniBoardColumnData[],
  searchValue: string,
): AssunzioniBoardColumnData[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) =>
      matchesSearchQuery(getAssunzioniCardSearchFields(card), searchValue),
    ),
  }))
}

export function countAssunzioniBoardProcesses(columns: AssunzioniBoardColumnData[]): number {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}
