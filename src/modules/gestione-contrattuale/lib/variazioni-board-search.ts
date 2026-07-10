import { matchesSearchQuery } from "@/lib/search-utils"

import type { VariazioniBoardCardData, VariazioniBoardColumnData } from "../types"

export function getVariazioniCardSearchFields(card: VariazioniBoardCardData): unknown[] {
  return [
    card.id,
    card.nomeCompleto,
    card.variazioneDaApplicare,
    card.dataVariazione,
    card.famiglia?.nome,
    card.famiglia?.cognome,
    card.famiglia?.email,
    card.famiglia?.telefono,
    card.lavoratore?.nome,
    card.lavoratore?.cognome,
    card.lavoratore?.email,
    card.lavoratore?.telefono,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
  ]
}

export function filterVariazioniBoardColumns(
  columns: VariazioniBoardColumnData[],
  searchValue: string,
): VariazioniBoardColumnData[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) =>
      matchesSearchQuery(getVariazioniCardSearchFields(card), searchValue),
    ),
  }))
}

export function countVariazioniBoardCards(columns: VariazioniBoardColumnData[]): number {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}
