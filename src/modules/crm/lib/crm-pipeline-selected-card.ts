import type { CrmPipelineCardData, CrmPipelineColumnData } from "../types"

export function findCardInPipelineColumns(
  columns: readonly CrmPipelineColumnData[],
  cardId: string,
): CrmPipelineCardData | null {
  for (const column of columns) {
    const matched = column.cards.find((card) => card.id === cardId)
    if (matched) return matched
  }
  return null
}

/**
 * Prefer the live board card; if it left the filtered board (e.g. sales
 * reassignment), keep showing the last retained snapshot so the detail
 * panel does not go blank.
 */
export function resolveSelectedPipelineCard(
  selectedCardId: string | null,
  columns: readonly CrmPipelineColumnData[],
  retainedCard: CrmPipelineCardData | null,
): CrmPipelineCardData | null {
  if (!selectedCardId) return null
  return (
    findCardInPipelineColumns(columns, selectedCardId) ??
    (retainedCard?.id === selectedCardId ? retainedCard : null)
  )
}
