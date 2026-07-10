import { matchesSearchQuery } from "@/lib/search-utils"

import type { ChiusureBoardCardData, ChiusureBoardColumnData } from "../types"

export function getChiusureCardSearchFields(card: ChiusureBoardCardData): unknown[] {
  return [
    card.id,
    card.nomeCompleto,
    card.email,
    card.motivazione,
    card.tipoLabel,
    card.dataFineRapporto,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
  ]
}

export function filterChiusureBoardColumns(
  columns: ChiusureBoardColumnData[],
  searchValue: string,
): ChiusureBoardColumnData[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) =>
      matchesSearchQuery(getChiusureCardSearchFields(card), searchValue),
    ),
  }))
}

export function countChiusureBoardCards(columns: ChiusureBoardColumnData[]): number {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}
