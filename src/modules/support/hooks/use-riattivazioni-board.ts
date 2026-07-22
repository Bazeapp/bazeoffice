import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

import {
  applyOptimisticCardMove,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { updateRecord } from "@/lib/record-crud"

import {
  RIATTIVAZIONI_BOARD_QUERY_KEY,
  RIATTIVAZIONI_REALTIME_TABLES,
} from "../lib/riattivazioni-board.constants"
import { fetchRiattivazioniBoardData } from "../lib/riattivazioni-board.utils"
import type {
  RiattivazioneStageId,
  RiattivazioniBoardCardData,
  RiattivazioniBoardColumnData,
} from "../types"

type BoardData = { columns: RiattivazioniBoardColumnData[] }

type UseRiattivazioniBoardState = {
  loading: boolean
  error: string | null
  columns: RiattivazioniBoardColumnData[]
  moveCard: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
  ) => void
}

export function useRiattivazioniBoard(): UseRiattivazioniBoardState {
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY,
    queryFn: fetchRiattivazioniBoardData,
  })

  const columns = data?.columns ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardData>(
    RIATTIVAZIONI_BOARD_QUERY_KEY,
  )

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        return {
          columns: updateCardInColumns(previous.columns, recordId, updater) as RiattivazioniBoardColumnData[],
        }
      })
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: RiattivazioneStageId },
    unknown,
    BoardData
  >({
    queryKey: RIATTIVAZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("chiusure_contratti", recordId, {
        stato_riattivazione_famiglia: targetStageId,
      }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      const nextColumns = applyOptimisticCardMove<
        RiattivazioniBoardColumnData,
        RiattivazioniBoardCardData
      >(
        previous.columns,
        recordId,
        targetStageId,
        (card, stage) => ({
          ...card,
          stage: stage as RiattivazioneStageId,
          record: {
            ...card.record,
            stato_riattivazione_famiglia: stage as RiattivazioneStageId,
          },
        }),
      )
      if (!nextColumns) return previous
      return { columns: nextColumns }
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: RiattivazioneStageId) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  useRealtimeBoardSync({
    tables: [...RIATTIVAZIONI_REALTIME_TABLES],
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
    updateCard,
  }
}
