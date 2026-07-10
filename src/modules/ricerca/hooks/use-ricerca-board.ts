import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { applyOptimisticCardMove } from "@/lib/board-column-utils"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"

import {
  buildRicercaBoardCardsForProcesses,
  fetchRicercaBoardColumns,
} from "../lib/ricerca-board.mappers"
import { fetchRicercaBoard } from "../queries/fetch-ricerca-board"
import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"

const RICERCA_REALTIME_TABLES = [
  "processi_matching",
  "famiglie",
  "indirizzi",
] as const

const RICERCA_BOARD_QUERY_KEY = ["ricerca-board"] as const

type UseRicercaBoardState = {
  loading: boolean
  error: string | null
  columns: RicercaBoardColumnData[]
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  loadDeferredColumn: (columnId: string) => Promise<void>
}

export function useRicercaBoard(): UseRicercaBoardState {
  const queryClient = useQueryClient()
  // IMPORTANT: ref (not state) so the queryFn closure always sees the
  // latest set. On refetch (e.g. realtime invalidate) the base call
  // returns deferred columns as empty + isLoaded:false, so we re-fetch
  // any column the user had already opted into to avoid the cards
  // "disappearing" right after Carica processi.
  const loadedDeferredColumnIdsRef = React.useRef<Set<string>>(new Set())

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: RICERCA_BOARD_QUERY_KEY,
    queryFn: async () => {
      const baseColumns = await fetchRicercaBoardColumns()
      const loaded = loadedDeferredColumnIdsRef.current
      if (loaded.size === 0) return baseColumns

      const lookupRowsPromise = fetchLookupValues().then((result) => result.rows)
      const overrides = new Map<string, RicercaBoardCardData[]>()

      await Promise.all(
        Array.from(loaded).map(async (columnId) => {
          const target = baseColumns.find((column) => column.id === columnId)
          if (!target) return
          const eagerValues = Array.from(
            new Set([target.id, target.label].filter(Boolean)),
          ) as string[]
          const [boardResult, lookupRows] = await Promise.all([
            fetchRicercaBoard(eagerValues, []),
            lookupRowsPromise,
          ])
          const cardsByStageId = await buildRicercaBoardCardsForProcesses(
            boardResult.processes,
            lookupRows,
          )
          overrides.set(columnId, cardsByStageId.get(columnId) ?? [])
        }),
      )

      return baseColumns.map((column) => {
        if (!overrides.has(column.id)) return column
        const cards = overrides.get(column.id) ?? []
        return {
          ...column,
          cards,
          totalCount: Math.max(column.totalCount, cards.length),
          isLoaded: true,
          isLoading: false,
        }
      })
    },
  })

  const columns = data ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<RicercaBoardColumnData[]>(
    RICERCA_BOARD_QUERY_KEY,
  )

  const loadDeferredColumn = React.useCallback(async (columnId: string) => {
    const currentColumns = queryClient.getQueryData<RicercaBoardColumnData[]>(RICERCA_BOARD_QUERY_KEY) ?? []
    const targetColumn = currentColumns.find((column) => column.id === columnId)
    if (!targetColumn || !targetColumn.deferred || targetColumn.isLoaded || targetColumn.isLoading) {
      return
    }

    setBoardData((previous) =>
      (previous ?? []).map((column) =>
        column.id === columnId ? { ...column, isLoading: true } : column,
      ),
    )

    try {
      const eagerValues = Array.from(
        new Set([targetColumn.id, targetColumn.label].filter(Boolean)),
      ) as string[]
      const [boardResult, lookupResultRows] = await Promise.all([
        fetchRicercaBoard(eagerValues, []),
        fetchLookupValues().then((result) => result.rows),
      ])
      const cardsByStageId = await buildRicercaBoardCardsForProcesses(
        boardResult.processes,
        lookupResultRows,
      )
      const loadedCards = cardsByStageId.get(columnId) ?? []

      // Record opt-in before mutating cache so any concurrent refetch
      // (realtime) sees this column as user-loaded.
      loadedDeferredColumnIdsRef.current = new Set([
        ...loadedDeferredColumnIdsRef.current,
        columnId,
      ])
      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === columnId
            ? {
                ...column,
                cards: loadedCards,
                totalCount: Math.max(column.totalCount, loadedCards.length),
                isLoaded: true,
                isLoading: false,
              }
            : column,
        ),
      )
    } catch {
      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === columnId ? { ...column, isLoading: false } : column,
        ),
      )
    }
  }, [queryClient, setBoardData])

  const moveMutation = useMoveMutation<
    { processId: string; targetStageId: string },
    unknown,
    RicercaBoardColumnData[]
  >({
    queryKey: RICERCA_BOARD_QUERY_KEY,
    mutationFn: ({ processId, targetStageId }) =>
      updateRecord("processi_matching", processId, { stato_res: targetStageId }),
    applyOptimistic: (previous, { processId, targetStageId }) => {
      if (!previous) return previous

      let sourceColumnId: string | null = null
      for (const column of previous) {
        if (column.cards.some((card) => card.id === processId)) {
          sourceColumnId = column.id
          break
        }
      }

      const movedColumns = applyOptimisticCardMove(previous, processId, targetStageId) as
        | RicercaBoardColumnData[]
        | undefined
      if (!movedColumns) return previous

      return movedColumns.map((column) => {
        if (column.id === sourceColumnId && sourceColumnId !== targetStageId) {
          return { ...column, totalCount: Math.max(0, column.totalCount - 1) }
        }
        if (column.id === targetStageId && sourceColumnId !== targetStageId) {
          return { ...column, totalCount: column.totalCount + 1 }
        }
        return column
      })
    },
  })

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ processId, targetStageId })
    },
    [moveMutation],
  )

  useRealtimeBoardSync({
    tables: [...RICERCA_REALTIME_TABLES],
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading: isLoading,
    error,
    columns,
    moveCard,
    loadDeferredColumn,
  }
}
