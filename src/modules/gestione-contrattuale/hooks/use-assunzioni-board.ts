import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useDeleteBoardRecordMutation, useMoveMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  updateCardAndRehome,
} from "@/lib/board-column-utils"
import { updateRecord } from "@/lib/record-crud"

import { fetchAssunzioniBoardData } from "../lib/assunzioni-board-data"
import {
  ASSUNZIONI_BOARD_QUERY_KEY,
  ASSUNZIONI_DEFERRED_STAGE_IDS,
  ASSUNZIONI_REALTIME_TABLES,
} from "../lib/assunzioni-board-constants"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData } from "../types"

type UseAssunzioniBoardState = {
  loading: boolean
  error: string | null
  columns: AssunzioniBoardColumnData[]
  loadDeferredColumn: (stageId: string) => Promise<void>
  moveCard: (rapportoId: string, targetStageId: string) => Promise<void>
  updateCard: (
    rapportoId: string,
    updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
  ) => void
  deleteRapporto: (rapportoId: string) => Promise<void>
}

export function useAssunzioniBoard(): UseAssunzioniBoardState {
  const queryClient = useQueryClient()
  // IMPORTANT: this MUST be a ref, not state. React Query's queryFn is set
  // once at mount; if we read state inside the closure it gets stale on
  // refetch (e.g. after a realtime invalidate) and deferred columns that
  // the user had explicitly loaded would revert to `loaded: false` with
  // empty cards. The ref is read fresh on every queryFn invocation.
  const loadedDeferredStageIdsRef = React.useRef<Set<string>>(new Set())

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    queryFn: async () => {
      const loaded = loadedDeferredStageIdsRef.current
      // Read previous card from latest cache at mapping time — see comment
      // on FetchAssunzioniBoardDataOptions.getPreviousCard for race rationale.
      const getPreviousCard = createBoardCardGetter(() =>
        queryClient.getQueryData<AssunzioniBoardColumnData[]>(ASSUNZIONI_BOARD_QUERY_KEY),
      )

      const baseColumns = await fetchAssunzioniBoardData({
        deferredLoadedStageIds: loaded,
        getPreviousCard,
      })

      if (loaded.size === 0) return baseColumns

      // The default RPC call (with null filter) does NOT return rows for
      // deferred stages. For each stage the user already opted into,
      // re-fetch it explicitly so it stays populated after invalidation.
      const overrides = await Promise.all(
        Array.from(loaded).map((stageId) =>
          fetchAssunzioniBoardData({
            deferredLoadedStageIds: loaded,
            onlyStageId: stageId,
            getPreviousCard,
          }).then((cols) => cols.find((column) => column.id === stageId) ?? null),
        ),
      )

      const overrideById = new Map<string, AssunzioniBoardColumnData>()
      for (const column of overrides) {
        if (column) overrideById.set(column.id, column)
      }

      return baseColumns.map((column) => overrideById.get(column.id) ?? column)
    },
  })

  const columns = data ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<AssunzioniBoardColumnData[]>(
    ASSUNZIONI_BOARD_QUERY_KEY,
  )

  const updateCard = React.useCallback(
    (
      rapportoId: string,
      updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
    ) => {
      setBoardData((previous) =>
        previous ? updateCardAndRehome(previous, rapportoId, updater) : previous,
      )
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { rapportoId: string; targetStageId: string },
    unknown,
    AssunzioniBoardColumnData[]
  >({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ rapportoId, targetStageId }) =>
      updateRecord("rapporti_lavorativi", rapportoId, { stato_assunzione: targetStageId }),
    applyOptimistic: (previous, { rapportoId, targetStageId }) => {
      if (!previous) return previous
      return applyOptimisticCardMove(previous, rapportoId, targetStageId) ?? previous
    },
  })

  const moveCard = React.useCallback(
    async (rapportoId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ rapportoId, targetStageId })
    },
    [moveMutation],
  )

  const deleteMutation = useDeleteBoardRecordMutation<
    { rapportoId: string },
    AssunzioniBoardColumnData[]
  >({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    table: "rapporti_lavorativi",
    getRecordId: ({ rapportoId }) => rapportoId,
    applyOptimistic: (previous, { rapportoId }) => {
      if (!previous) return previous
      return previous.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== rapportoId),
      }))
    },
  })

  const deleteRapporto = React.useCallback(
    async (rapportoId: string) => {
      await deleteMutation.mutateAsync({ rapportoId })
    },
    [deleteMutation],
  )

  const loadDeferredColumn = React.useCallback(
    async (stageId: string) => {
      if (!ASSUNZIONI_DEFERRED_STAGE_IDS.has(stageId) || loadedDeferredStageIdsRef.current.has(stageId)) return

      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === stageId ? { ...column, loadError: null, loading: true } : column,
        ),
      )

      try {
        const loadedColumns = await fetchAssunzioniBoardData({
          deferredLoadedStageIds: new Set([stageId]),
          onlyStageId: stageId,
          getPreviousCard: createBoardCardGetter(() =>
            queryClient.getQueryData<AssunzioniBoardColumnData[]>(ASSUNZIONI_BOARD_QUERY_KEY),
          ),
        })
        const loadedColumn = loadedColumns.find((column) => column.id === stageId)

        // Mark this stage as "user-opted-in" before mutating cache so that any
        // concurrent refetch (e.g. realtime) sees the updated set.
        loadedDeferredStageIdsRef.current = new Set([
          ...loadedDeferredStageIdsRef.current,
          stageId,
        ])
        setBoardData((previous) =>
          (previous ?? []).map((column) =>
            column.id === stageId
              ? {
                  ...column,
                  cards: loadedColumn?.cards ?? [],
                  loadError: null,
                  loaded: true,
                  loading: false,
                }
              : column,
          ),
        )
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Errore caricamento colonna"
        setBoardData((previous) =>
          (previous ?? []).map((column) =>
            column.id === stageId
              ? { ...column, loadError: message, loaded: false, loading: false }
              : column,
          ),
        )
      }
    },
    [setBoardData, queryClient],
  )

  useRealtimeBoardSync({
    tables: [...ASSUNZIONI_REALTIME_TABLES],
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
    loadDeferredColumn,
    moveCard,
    updateCard,
    deleteRapporto,
  }
}
