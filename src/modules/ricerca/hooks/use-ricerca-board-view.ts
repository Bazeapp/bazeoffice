import * as React from "react"

import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { toAvatarRingClass } from "@/lib/utils"

import type { RicercaCardRecruiter } from "../components/ricerca-active-search-card"
import {
  countRicercaBoardCards,
  filterRicercaBoardColumns,
} from "../lib/ricerca-board-view.mappers"
import type { RicercaBoardCardData } from "../types"
import { useRicercaBoard } from "./use-ricerca-board"

export type RicercaBoardViewProps = {
  onOpenDetail: (processId: string) => void
}

export type RicercaBoardViewDragHandlers = {
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
}

function buildRecruitersById(
  operatorOptions: OperatoreOption[],
): Map<string, RicercaCardRecruiter> {
  return new Map(
    operatorOptions.map((option) => [
      option.id,
      {
        avatar: option.avatar,
        ringClassName: toAvatarRingClass(option.avatarBorderClassName),
        label: option.label,
      },
    ]),
  )
}

export function useRicercaBoardView({ onOpenDetail }: RicercaBoardViewProps) {
  const { loading, error, columns, moveCard, loadDeferredColumn } = useRicercaBoard()
  const { options: operatorOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })

  const recruitersById = React.useMemo(
    () => buildRecruitersById(operatorOptions),
    [operatorOptions],
  )
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOperatorId, setSelectedOperatorId] = React.useState("all")

  const filteredColumns = React.useMemo(
    () =>
      filterRicercaBoardColumns(columns, {
        searchQuery,
        selectedOperatorId,
      }),
    [columns, searchQuery, selectedOperatorId],
  )

  const selectedOperator = React.useMemo(
    () =>
      operatorOptions.find((operator) => operator.id === selectedOperatorId) ?? null,
    [operatorOptions, selectedOperatorId],
  )

  React.useEffect(() => {
    if (selectedOperatorId === "all" || selectedOperatorId === "unassigned") return

    const isSelectable = operatorOptions.some(
      (operator) => operator.id === selectedOperatorId,
    )
    if (!isSelectable) {
      setSelectedOperatorId("all")
    }
  }, [operatorOptions, selectedOperatorId])

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId
      setDropTargetColumnId(null)
      setDraggingProcessId(null)
      if (!processId) return
      void moveCard(processId, columnId)
    },
    [draggingProcessId, moveCard],
  )

  const handleDragLeaveColumn = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const stillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (stillInside) return
      setDropTargetColumnId(null)
    },
    [],
  )

  const handleDragEndCard = React.useCallback(() => {
    setDraggingProcessId(null)
    setDropTargetColumnId(null)
  }, [])

  const handleCardClick = React.useCallback(
    (card: RicercaBoardCardData) => {
      onOpenDetail(card.id)
    },
    [onOpenDetail],
  )

  const handleLoadDeferredColumn = React.useCallback(
    (columnId: string) => {
      void loadDeferredColumn(columnId)
    },
    [loadDeferredColumn],
  )

  const totalRicerche = React.useMemo(
    () => countRicercaBoardCards(filteredColumns),
    [filteredColumns],
  )

  const drag = React.useMemo<RicercaBoardViewDragHandlers>(
    () => ({
      onDragEnterColumn: setDropTargetColumnId,
      onDragOverColumn: setDropTargetColumnId,
      onDragLeaveColumn: handleDragLeaveColumn,
      onDropToColumn: handleDropToColumn,
      onDragStartCard: setDraggingProcessId,
      onDragEndCard: handleDragEndCard,
    }),
    [handleDragEndCard, handleDragLeaveColumn, handleDropToColumn],
  )

  return {
    asyncState: {
      loading,
      error,
    },
    header: {
      totalRicerche,
      searchQuery,
      onSearchQueryChange: setSearchQuery,
      selectedOperatorId,
      onSelectedOperatorIdChange: setSelectedOperatorId,
      operatorOptions,
      selectedOperator,
    },
    board: {
      columns: filteredColumns,
      recruitersById,
      draggingProcessId,
      dropTargetColumnId,
      drag,
      onCardClick: handleCardClick,
      onLoadDeferredColumn: handleLoadDeferredColumn,
    },
  }
}
