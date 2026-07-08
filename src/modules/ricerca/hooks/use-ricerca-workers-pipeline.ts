import * as React from "react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useMoveMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import { updateRecord } from "@/lib/record-crud"

import type { RicercaWorkerSelectionCard, RicercaWorkerSelectionColumn } from "../types"
import type { RicercaWorkersPipelineState } from "../types"
import { RICERCA_WORKERS_REALTIME_TABLES } from "../lib/pipeline-constants"
import { fetchWorkersPipelineData } from "../lib/pipeline-fetch"
import { applyRicercaWorkersPipelineMoveOptimistic } from "../lib/pipeline-mutations"

export function useRicercaWorkersPipeline(
  processId: string,
): RicercaWorkersPipelineState {
  const queryClient = useQueryClient()
  const boardQueryKey = React.useMemo(
    () => ["ricerca-workers-pipeline", processId] as const,
    [processId],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => fetchWorkersPipelineData(processId),
  })

  const columns = React.useMemo(() => data ?? [], [data])

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["ricerca-workers-pipeline"] })
  }, [queryClient])

  const refresh = React.useCallback(() => {
    void refetch()
  }, [refetch])

  useRealtimeBoardSync({
    tables: [...RICERCA_WORKERS_REALTIME_TABLES],
    reload: invalidateBoard,
  })

  const moveMutation = useMoveMutation<
    {
      selectionId: string
      targetStatusId: string
      currentCard: RicercaWorkerSelectionCard | undefined
    },
    unknown,
    RicercaWorkerSelectionColumn[]
  >({
    queryKey: boardQueryKey,
    mutationFn: async ({ selectionId, targetStatusId, currentCard }) => {
      await updateRecord("selezioni_lavoratori", selectionId, {
        stato_selezione: targetStatusId,
      })
      await invokeWorkerAvailabilityForIds(
        getSelectionAvailabilityWorkerIds(
          currentCard
            ? {
                lavoratore_id: currentCard.worker.id,
                stato_selezione: currentCard.status,
              }
            : null,
          { stato_selezione: targetStatusId },
        ),
      )
    },
    applyOptimistic: (previous, variables) =>
      applyRicercaWorkersPipelineMoveOptimistic(previous, variables),
  })

  const moveCard = React.useCallback(
    async (selectionId: string, targetStatusId: string) => {
      const currentCard = columns
        .flatMap((column) => column.cards)
        .find((card) => card.id === selectionId)
      try {
        await moveMutation.mutateAsync({ selectionId, targetStatusId, currentCard })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato selezione lavoratore"
        toast.error(message)
      }
    },
    [columns, moveMutation],
  )

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading,
    error,
    columns,
    moveCard,
    refresh,
  }
}
