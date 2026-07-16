import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation, usePatchMutation } from "@/hooks/use-board-mutations"
import { updateCardInList } from "@/lib/board-column-utils"
import { formatItalianCurrencyLabelFromPatch } from "@/lib/format-utils"
import { updateRecord } from "@/lib/record-crud"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { ContributoInpsRecord } from "@/types"

import {
  CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS,
  fetchContributiBoardData,
} from "../lib/contributi-inps-board"
import type { ContributiStageDefinition, ContributoInpsBoardCardData, ContributoQuarterValue } from "../types"

const CONTRIBUTI_REALTIME_TABLES = [
  "contributi_inps",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
]

type UseContributiInpsBoardState = {
  loading: boolean
  error: string | null
  stages: ContributiStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  patchCard: (recordId: string, patch: Partial<ContributoInpsRecord>) => Promise<void>
}

type BoardData = {
  stages: ContributiStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
}

export function useContributiInpsBoard(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue,
): UseContributiInpsBoardState {
  const boardQueryKey = React.useMemo(
    () => ["contributi-inps-board", selectedYear, selectedQuarter] as const,
    [selectedYear, selectedQuarter],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => fetchContributiBoardData(selectedYear, selectedQuarter),
  })

  const stages = data?.stages ?? CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS
  const cards = data?.cards ?? []
  const activeRapportiCount = data?.activeRapportiCount ?? 0

  const { invalidateBoard } = useBoardQueryCache<BoardData>(
    boardQueryKey,
    "contributi-inps-board",
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    BoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("contributi_inps", recordId, { stato_contributi_inps: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: updateCardInList(previous.cards, recordId, (card) => ({
          ...card,
          stage: targetStageId,
          record: { ...card.record, stato_contributi_inps: targetStageId },
        })),
      }
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  const patchMutation = usePatchMutation<
    { recordId: string; patch: Partial<ContributoInpsRecord> },
    unknown,
    BoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("contributi_inps", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: updateCardInList(previous.cards, recordId, (card) => ({
          ...card,
          record: { ...card.record, ...patch },
          importoLabel: formatItalianCurrencyLabelFromPatch(
            patch.importo_contributi_inps,
            card.importoLabel,
          ),
          pagopaLabel: formatItalianCurrencyLabelFromPatch(patch.valore_pagopa, card.pagopaLabel),
        })),
      }
    },
  })

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<ContributoInpsRecord>) => {
      await patchMutation.mutateAsync({ recordId, patch })
    },
    [patchMutation],
  )

  useRealtimeBoardSync({
    tables: CONTRIBUTI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchMutation.error instanceof Error
        ? patchMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

  return {
    loading: isLoading,
    error,
    stages,
    cards,
    activeRapportiCount,
    moveCard,
    patchCard,
  }
}
