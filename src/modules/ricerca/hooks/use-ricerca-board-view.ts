import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useAuthSession } from "@/hooks/use-auth-session"
import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { toAvatarRingClass } from "@/lib/utils"
import { fetchCurrentOperatorId } from "@/modules/commenti/queries"

import type { RicercaCardRecruiter } from "../components/ricerca-active-search-card"
import {
  RICERCA_BOARD_RECRUITER_FILTER_ALL,
  readStoredRecruiterFilter,
  resolveRecruiterFilter,
  writeStoredRecruiterFilter,
} from "../lib/ricerca-board-recruiter-filter"
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
  const { session } = useAuthSession()
  const authUserId = session?.user.id
  const { options: operatorOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })
  const currentOperatorIdQuery = useQuery({
    queryKey: ["commenti", "current-operator-id", authUserId],
    queryFn: fetchCurrentOperatorId,
    enabled: Boolean(authUserId),
    staleTime: 5 * 60 * 1000,
  })

  const recruitersById = React.useMemo(
    () => buildRecruitersById(operatorOptions),
    [operatorOptions],
  )
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOperatorId, setSelectedOperatorIdState] = React.useState(
    () => readStoredRecruiterFilter() ?? RICERCA_BOARD_RECRUITER_FILTER_ALL,
  )
  const [hasStoredFilter] = React.useState(() => readStoredRecruiterFilter() !== null)
  const filterInitializedRef = React.useRef(hasStoredFilter)

  const setSelectedOperatorId = React.useCallback((value: string) => {
    setSelectedOperatorIdState(value)
    writeStoredRecruiterFilter(value)
    filterInitializedRef.current = true
  }, [])

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
    if (operatorOptions.length === 0) return

    const selectableOperatorIds = operatorOptions.map((operator) => operator.id)
    const currentOperatorId = currentOperatorIdQuery.data ?? null
    const currentOperatorReady =
      !authUserId || currentOperatorIdQuery.isFetched || currentOperatorIdQuery.isError

    if (!filterInitializedRef.current) {
      if (!currentOperatorReady) return

      const resolved = resolveRecruiterFilter({
        stored: null,
        currentOperatorId,
        selectableOperatorIds,
      })
      setSelectedOperatorId(resolved)
      return
    }

    const resolved = resolveRecruiterFilter({
      stored: selectedOperatorId,
      currentOperatorId,
      selectableOperatorIds,
    })
    if (resolved !== selectedOperatorId) {
      setSelectedOperatorId(resolved)
    }
  }, [
    authUserId,
    currentOperatorIdQuery.data,
    currentOperatorIdQuery.isError,
    currentOperatorIdQuery.isFetched,
    operatorOptions,
    selectedOperatorId,
    setSelectedOperatorId,
  ])

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
