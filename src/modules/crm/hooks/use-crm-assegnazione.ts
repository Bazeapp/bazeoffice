import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { usePatchMutation } from "@/hooks/use-board-mutations"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { updateRecord } from "@/lib/record-crud"

import {
  applyAssegnazioneOptimisticPatch,
  fetchAssegnazioneCards,
  toAssegnazioneStatusPatch,
} from "../lib/assegnazione-data-utils"
import type { AssegnazioneCardData } from "../types"

const ASSEGNAZIONE_REALTIME_TABLES = ["processi_matching", "famiglie"]
const ASSEGNAZIONE_BOARD_QUERY_KEY = ["crm-assegnazione-board"] as const

type UseCrmAssegnazioneState = {
  loading: boolean
  error: string | null
  cards: AssegnazioneCardData[]
  assignCardToDate: (
    processId: string,
    date: string | null
  ) => Promise<void>
  patchCard: (processId: string, patch: Record<string, unknown>) => Promise<void>
}

export function useCrmAssegnazione(): UseCrmAssegnazioneState {
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ASSEGNAZIONE_BOARD_QUERY_KEY,
    queryFn: fetchAssegnazioneCards,
  })

  const cards = data ?? []

  const { invalidateBoard } = useBoardQueryCache<AssegnazioneCardData[]>(
    ASSEGNAZIONE_BOARD_QUERY_KEY,
  )

  const patchMutation = usePatchMutation<
    { processId: string; patch: Record<string, unknown> },
    unknown,
    AssegnazioneCardData[]
  >({
    queryKey: ASSEGNAZIONE_BOARD_QUERY_KEY,
    mutationFn: ({ processId, patch }) =>
      updateRecord("processi_matching", processId, patch),
    applyOptimistic: (previous, { processId, patch }) => {
      if (!previous) return previous
      return applyAssegnazioneOptimisticPatch(previous, processId, patch)
    },
  })

  const patchCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      await patchMutation.mutateAsync({ processId, patch })
    },
    [patchMutation],
  )

  const assignCardToDate = React.useCallback(
    async (processId: string, date: string | null) => {
      const nextStatus = date ? "fare_ricerca" : "da_assegnare"
      await patchCard(processId, {
        data_assegnazione: date,
        stato_res: toAssegnazioneStatusPatch(nextStatus),
      })
    },
    [patchCard],
  )

  useRealtimeBoardSync({
    tables: ASSEGNAZIONE_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    patchMutation.error instanceof Error
      ? patchMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading: isLoading,
    error,
    cards,
    assignCardToDate,
    patchCard,
  }
}
