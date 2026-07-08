import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "../types"
import { sortWorkerSelectionColumns } from "./pipeline-column-utils"
import {
  isArchivioStatus,
  isCandidatiStatus,
  isColloquiStatus,
  isDaColloquiareStatus,
} from "./pipeline-status-utils"

export function applyRicercaWorkersPipelineMoveOptimistic(
  previous: RicercaWorkerSelectionColumn[] | undefined,
  {
    selectionId,
    targetStatusId,
  }: {
    selectionId: string
    targetStatusId: string
  },
): RicercaWorkerSelectionColumn[] | undefined {
  if (!previous) return previous
  let movedCard: RicercaWorkerSelectionCard | null = null
  const nextColumns = previous.map((column) => {
    if (column.cards.some((card) => card.id === selectionId)) {
      const remainingCards = column.cards.filter((card) => {
        if (card.id !== selectionId) return true
        movedCard = { ...card, status: targetStatusId }
        return false
      })
      return { ...column, cards: remainingCards }
    }
    return column
  })
  if (!movedCard) return previous
  return sortWorkerSelectionColumns(
    nextColumns.map((column) =>
      column.id === targetStatusId ||
      (column.id === "__candidati__" && isCandidatiStatus(targetStatusId)) ||
      (column.id === "__da_colloquiare__" && isDaColloquiareStatus(targetStatusId)) ||
      (column.id === "__archivio__" && isArchivioStatus(targetStatusId)) ||
      (column.id === "__colloqui_prove__" && isColloquiStatus(targetStatusId))
        ? { ...column, cards: [movedCard as RicercaWorkerSelectionCard, ...column.cards] }
        : column,
    ),
  )
}
