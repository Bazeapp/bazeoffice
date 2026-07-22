import * as React from "react"

import type { RiattivazioneStageId, RiattivazioniBoardCardData } from "../types"
import {
  countRiattivazioniCards,
  filterRiattivazioniColumns,
} from "../lib/riattivazioni-board.utils"
import { useRiattivazioniBoard } from "./use-riattivazioni-board"

export function useRiattivazioniBoardView() {
  const { loading, error, columns, moveCard, updateCard } = useRiattivazioniBoard()
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<RiattivazioneStageId | null>(
    null,
  )
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredColumns = React.useMemo(
    () => filterRiattivazioniColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalRiattivazioni = React.useMemo(
    () => countRiattivazioniCards(filteredColumns),
    [filteredColumns],
  )

  const selectedCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  )

  const handleDragEndCard = React.useCallback(() => {
    window.setTimeout(() => {
      setDraggingRecordId(null)
      setDropTargetColumnId(null)
    }, 0)
  }, [])

  const handleDragLeaveColumn = React.useCallback(
    (columnId: RiattivazioneStageId) => (event: React.DragEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
      setDropTargetColumnId((current) => (current === columnId ? null : current))
    },
    [],
  )

  const handleDropToColumn = React.useCallback(
    (columnId: RiattivazioneStageId, recordId: string | null) => {
      setDropTargetColumnId(null)
      setDraggingRecordId(null)
      if (!recordId) return
      void moveCard(recordId, columnId)
    },
    [moveCard],
  )

  const handleDetailOpenChange = React.useCallback((open: boolean) => {
    if (!open) setSelectedCardId(null)
  }, [])

  const handleCardChange = React.useCallback(
    (nextCard: RiattivazioniBoardCardData) => {
      updateCard(nextCard.id, () => nextCard)
    },
    [updateCard],
  )

  return {
    error,
    header: {
      totalRiattivazioni,
      searchValue,
      setSearchValue,
    },
    kanban: {
      loading,
      columns: filteredColumns,
      draggingRecordId,
      dropTargetColumnId,
      onOpenCard: setSelectedCardId,
      onDragStartCard: setDraggingRecordId,
      onDragEndCard: handleDragEndCard,
      onDragEnterColumn: setDropTargetColumnId,
      onDragOverColumn: setDropTargetColumnId,
      onDragLeaveColumn: handleDragLeaveColumn,
      onDropToColumn: handleDropToColumn,
    },
    detailSheet: {
      selectedCardId,
      card: selectedCard,
      columns,
      open: Boolean(selectedCard),
      onOpenChange: handleDetailOpenChange,
      onStatusChange: moveCard,
      onCardChange: handleCardChange,
    },
  }
}
