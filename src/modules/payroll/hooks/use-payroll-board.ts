import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useMoveMutation, usePatchMutation } from "@/hooks/use-board-mutations"
import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  mergeCardDetailInColumns,
  updateCardInColumns,
  updateMatchingCardInColumns,
} from "@/lib/board-column-utils"
import { updateRecord } from "@/lib/record-crud"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { MeseLavoratoRecord, PresenzaMensileRecord } from "@/types"

import {
  applyPayrollCardPatch,
  applyPayrollPresencePatch,
  fetchPayrollBoardData,
  PAYROLL_REALTIME_TABLES,
} from "../lib/payroll-board"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"

type UsePayrollBoardState = {
  loading: boolean
  error: string | null
  columns: PayrollBoardColumnData[]
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  patchCard: (recordId: string, patch: Partial<MeseLavoratoRecord>) => Promise<void>
  patchPresence: (recordId: string, patch: Partial<PresenzaMensileRecord>) => Promise<void>
  /**
   * Inject detail-loader fields (presenze, presenzeRegolari, enriched record /
   * rapporto / famiglia / mese columns) into the cached card. The detail panel
   * then reads from the board cache directly — same shape as CRM pipeline.
   * If the card is not in the cache (e.g. it was filtered out), this is a
   * no-op. Returns the merged card or undefined.
   */
  enrichCardFromDetail: (
    cardId: string,
    detail: Partial<PayrollBoardCardData>,
  ) => PayrollBoardCardData | undefined
  /**
   * Incremented by useRealtimeBoardSync when a remote change arrives (and
   * passes the echo-window guard). The view binds the detail loader's
   * useEffect deps to this tick so the open detail panel re-fetches its
   * detail-only fields (e.g. presenze) when another user modifies them.
   *
   * Without this, Pattern A's preserveDetailFields would restore the
   * LOCAL previous presenze values during the board refetch, silently
   * hiding the remote change until page reload.
   */
  detailRefreshTick: number
}

export function usePayrollBoard(selectedMonth: string): UsePayrollBoardState {
  const queryClient = useQueryClient()
  const boardQueryKey = React.useMemo(
    () => ["payroll-board", selectedMonth] as const,
    [selectedMonth],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () =>
      fetchPayrollBoardData(
        selectedMonth,
        createBoardCardGetter(() =>
          queryClient.getQueryData<PayrollBoardColumnData[]>(boardQueryKey),
        ),
      ),
  })

  const columns = data ?? []

  const { setBoardData, invalidateBoard } = useBoardQueryCache<PayrollBoardColumnData[]>(
    boardQueryKey,
    "payroll-board",
  )

  type PayrollBoard = PayrollBoardColumnData[]

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("mesi_lavorati", recordId, { stato_mese_lavorativo: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      const nextColumns = applyOptimisticCardMove(previous, recordId, targetStageId) as
        | PayrollBoardColumnData[]
        | undefined
      return nextColumns ?? previous
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  const patchCardMutation = usePatchMutation<
    { recordId: string; patch: Partial<MeseLavoratoRecord> },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return updateCardInColumns<PayrollBoardColumnData, PayrollBoardCardData>(
        previous,
        recordId,
        (card) => applyPayrollCardPatch(card, patch),
      )
    },
  })

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<MeseLavoratoRecord>) => {
      await patchCardMutation.mutateAsync({ recordId, patch })
    },
    [patchCardMutation],
  )

  const patchPresenceMutation = usePatchMutation<
    { recordId: string; patch: Partial<PresenzaMensileRecord> },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return updateMatchingCardInColumns<PayrollBoardCardData, PayrollBoardColumnData>(
        previous,
        (card) => card.presenze?.id === recordId,
        (card) => applyPayrollPresencePatch(card, recordId, patch),
      )
    },
  })

  const patchPresence = React.useCallback(
    async (recordId: string, patch: Partial<PresenzaMensileRecord>) => {
      await patchPresenceMutation.mutateAsync({ recordId, patch })
    },
    [patchPresenceMutation],
  )

  const [detailRefreshTick, setDetailRefreshTick] = React.useState(0)
  const bumpDetailRefreshTick = React.useCallback(() => {
    setDetailRefreshTick((current) => current + 1)
  }, [])

  useRealtimeBoardSync({
    tables: [...PAYROLL_REALTIME_TABLES],
    reload: invalidateBoard,
    reloadOpenDetail: bumpDetailRefreshTick,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchCardMutation.error instanceof Error
        ? patchCardMutation.error.message
        : patchPresenceMutation.error instanceof Error
          ? patchPresenceMutation.error.message
          : queryError instanceof Error
            ? queryError.message
            : null

  const enrichCardFromDetail = React.useCallback(
    (
      cardId: string,
      detail: Partial<PayrollBoardCardData>,
    ): PayrollBoardCardData | undefined => {
      let mergedCard: PayrollBoardCardData | undefined
      setBoardData((previous) => {
        if (!previous) return previous
        const result = mergeCardDetailInColumns(previous, cardId, detail)
        mergedCard = result.mergedCard
        return result.columns
      })
      return mergedCard
    },
    [setBoardData],
  )

  return {
    loading: isLoading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
    enrichCardFromDetail,
    detailRefreshTick,
  }
}
