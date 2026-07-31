import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useCreateMutation, useMoveMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"
import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { eventMatchesOpenDetailIds } from "@/lib/realtime-open-detail"
import { createRecord, updateRecord } from "@/lib/record-crud"

import {
  VARIAZIONI_BOARD_QUERY_KEY,
  VARIAZIONI_DEFAULT_STAGE_DEFINITIONS,
  VARIAZIONI_REALTIME_TABLES,
} from "../lib/variazioni-board-constants"
import {
  fetchVariazioniBoardData,
  type VariazioniBoardData,
} from "../lib/variazioni-board-data"
import type { VariazioniBoardCardData } from "../types"
import type { VariazioneContrattualeRecord } from "@/types"

type UseVariazioniBoardState = {
  loading: boolean
  error: string | null
  columns: VariazioniBoardData["columns"]
  rapportoOptions: VariazioniBoardData["rapportoOptions"]
  createVariazione: (input: {
    rapportoId: string
    variazioneDaApplicare: string
    dataVariazione: string
  }) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
  ) => void
  /**
   * Bumped by useRealtimeBoardSync after a remote change passes echo guards.
   * Open-sheet loaders must depend on this so selectedFreshCard re-fetches
   * (cedolini Pattern B twin).
   */
  detailRefreshTick: number
  /** Register ids for the open sheet so unrelated CDC events skip detail reload. */
  setOpenDetailIdsForRealtime: (
    ids: ReadonlyArray<string | null | undefined>,
  ) => void
}

export function useVariazioniBoard(): UseVariazioniBoardState {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    queryFn: () =>
      fetchVariazioniBoardData({
        getPreviousCard: createBoardCardGetter(() => {
          const latest = queryClient.getQueryData<VariazioniBoardData>(
            VARIAZIONI_BOARD_QUERY_KEY,
          )
          return latest?.columns
        }),
      }),
  })

  const columns = data?.columns ?? []
  const rapportoOptions = data?.rapportoOptions ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<VariazioniBoardData>(
    VARIAZIONI_BOARD_QUERY_KEY,
  )

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          columns: updateCardInColumns(previous.columns, recordId, updater),
        }
      })
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    VariazioniBoardData
  >({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("variazioni_contrattuali", recordId, { stato: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      const nextColumns = applyOptimisticCardMove(previous.columns, recordId, targetStageId)
      return nextColumns ? { ...previous, columns: nextColumns } : previous
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  const createMutation = useCreateMutation<
    { rapportoId: string; variazioneDaApplicare: string; dataVariazione: string },
    { record: VariazioneContrattualeRecord; initialStage: string },
    VariazioniBoardData
  >({
    queryKey: VARIAZIONI_BOARD_QUERY_KEY,
    mutationFn: async (input) => {
      const initialStage = VARIAZIONI_DEFAULT_STAGE_DEFINITIONS[0].id
      const response = await createRecord("variazioni_contrattuali", {
        rapporto_lavorativo_id: input.rapportoId,
        variazione_da_applicare: input.variazioneDaApplicare,
        data_variazione: input.dataVariazione || null,
        stato: initialStage,
      })
      return { record: response.row as VariazioneContrattualeRecord, initialStage }
    },
  })

  const createVariazione = React.useCallback(
    async (input: {
      rapportoId: string
      variazioneDaApplicare: string
      dataVariazione: string
    }) => {
      await createMutation.mutateAsync(input)
    },
    [createMutation],
  )

  const [detailRefreshTick, setDetailRefreshTick] = React.useState(0)
  const bumpDetailRefreshTick = React.useCallback(() => {
    setDetailRefreshTick((current) => current + 1)
  }, [])

  const openDetailIdsRef = React.useRef<ReadonlySet<string>>(new Set())
  const setOpenDetailIdsForRealtime = React.useCallback(
    (ids: ReadonlyArray<string | null | undefined>) => {
      openDetailIdsRef.current = new Set(
        ids.filter((id): id is string => typeof id === "string" && id.length > 0),
      )
    },
    [],
  )

  const shouldReloadOpenDetail = React.useCallback(
    (event: RealtimeRowEvent) =>
      eventMatchesOpenDetailIds(event, openDetailIdsRef.current),
    [],
  )

  useRealtimeBoardSync({
    tables: [...VARIAZIONI_REALTIME_TABLES],
    reload: invalidateBoard,
    reloadOpenDetail: bumpDetailRefreshTick,
    shouldReloadOpenDetail,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

  return {
    loading: isLoading,
    error,
    columns,
    rapportoOptions,
    createVariazione,
    moveCard,
    updateCard,
    detailRefreshTick,
    setOpenDetailIdsForRealtime,
  }
}
