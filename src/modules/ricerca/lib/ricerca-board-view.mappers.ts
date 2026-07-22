import { matchesSearchQuery } from "@/lib/search-utils"

import { normalizeRicercaStageToken } from "./board-column-utils"
import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"

export function getRicercaCardSearchFields(card: RicercaBoardCardData): unknown[] {
  return [
    card.id,
    card.nomeFamiglia,
    card.cognomeFamiglia,
    card.email,
    card.telefono,
    card.zona,
    ...(card.tipoLavoroBadges ?? []),
    card.tipoLavoroBadge,
    card.tipoRapportoBadge,
    card.oreSettimanali,
    card.giorniSettimanali,
  ]
}

function matchesOperatorFilter(
  card: RicercaBoardCardData,
  selectedOperatorId: string,
): boolean {
  if (selectedOperatorId === "unassigned" && card.operatorId) {
    return false
  }
  if (
    selectedOperatorId !== "all" &&
    selectedOperatorId !== "unassigned" &&
    card.operatorId !== selectedOperatorId
  ) {
    return false
  }
  return true
}

export type RicercaBoardViewFilters = {
  searchQuery: string
  selectedOperatorId: string
}

export function filterRicercaBoardColumns(
  columns: RicercaBoardColumnData[],
  filters: RicercaBoardViewFilters,
): RicercaBoardColumnData[] {
  const hasActiveFilters =
    filters.selectedOperatorId !== "all" || filters.searchQuery.trim().length > 0

  return columns.map((column) => {
    const filteredCards = column.cards.filter((card) => {
      if (!matchesOperatorFilter(card, filters.selectedOperatorId)) {
        return false
      }
      return matchesSearchQuery(getRicercaCardSearchFields(card), filters.searchQuery)
    })

    return {
      ...column,
      totalCount:
        column.deferred && !column.isLoaded && !hasActiveFilters
          ? column.totalCount
          : filteredCards.length,
      cards: filteredCards,
    }
  })
}

export function getDeferredColumnActionLabel(column: RicercaBoardColumnData): string {
  const token = normalizeRicercaStageToken(column.label || column.id)
  if (token === "match") return "Mostra Match"
  if (token === "no match") return "Mostra NoMatch"
  return `Mostra ${column.label}`
}

export function countRicercaBoardCards(columns: RicercaBoardColumnData[]): number {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}
