import * as React from "react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import {
  useDeleteBoardRecordMutation,
  useMoveMutation,
  usePatchMutation,
} from "@/hooks/use-board-mutations"
import {
  applyOptimisticCardMove,
  createBoardCardGetter,
  updateCardInColumns,
} from "@/lib/board-column-utils"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

import {
  applyChiusuraPatchInColumns,
  CHIUSURE_BOARD_QUERY_KEY,
  CHIUSURE_REALTIME_TABLES,
  fetchChiusureBoardData,
  LICENZIAMENTO_STAGE_ID,
  type ChiusureBoardData,
} from "../lib"
import type { ChiusureBoardCardData, ChiusureBoardColumnData } from "../types"
import type { ChiusuraContrattoRecord } from "@/types"

type UseChiusureBoardState = {
  loading: boolean
  error: string | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: ChiusureBoardData["rapportoOptions"]
  tipoLicenziamentoOptions: ChiusureBoardData["tipoLicenziamentoOptions"]
  createChiusura: (input: {
    rapportoId: string
    tipo: "licenziamento" | "dimissione" | "annullamento"
    dataFineRapporto: string
    note: string
  }) => Promise<void>
  linkRapporto: (chiusuraId: string, rapportoId: string | null) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  /**
   * Persist an arbitrary patch on a chiusura record. Optimistic update via the
   * React Query cache, then invalidate on settle so Realtime stays consistent.
   */
  patchChiusura: (recordId: string, patch: Partial<ChiusuraContrattoRecord>) => Promise<void>
  /**
   * @deprecated Mutations + cache invalidation keep card state in sync now.
   * Kept as a no-op for backwards compatibility with callers that haven't been
   * migrated yet.
   */
  updateCard: (
    recordId: string,
    updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
  ) => void
  deleteChiusura: (recordId: string) => Promise<void>
}

function formatErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useChiusureBoard(): UseChiusureBoardState {
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = React.useState<string | null>(null)

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery<ChiusureBoardData>({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    queryFn: () =>
      fetchChiusureBoardData({
        getPreviousCard: createBoardCardGetter(() => {
          const latest = queryClient.getQueryData<ChiusureBoardData>(
            CHIUSURE_BOARD_QUERY_KEY,
          )
          return latest?.columns
        }),
      }),
  })

  const columns = React.useMemo(() => data?.columns ?? [], [data?.columns])
  const rapportoOptions = React.useMemo(
    () => data?.rapportoOptions ?? [],
    [data?.rapportoOptions],
  )
  const tipoLicenziamentoOptions = React.useMemo(
    () => data?.tipoLicenziamentoOptions ?? [],
    [data?.tipoLicenziamentoOptions],
  )

  const { setBoardData, invalidateBoard } = useBoardQueryCache<ChiusureBoardData>(
    CHIUSURE_BOARD_QUERY_KEY,
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("chiusure_contratti", recordId, { stato: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      setMutationError(null)
      if (!previous) return previous
      return {
        ...previous,
        columns:
          applyOptimisticCardMove(previous.columns, recordId, targetStageId) ?? previous.columns,
      }
    },
  })
  React.useEffect(() => {
    if (moveMutation.error) {
      setMutationError(formatErrorMessage(moveMutation.error, "Errore aggiornando stato chiusura"))
    }
  }, [moveMutation.error])

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const movingCard = columns.flatMap((column) => column.cards).find((card) => card.id === recordId)
      const licenziamentoIndex = columns.findIndex((column) => column.id === LICENZIAMENTO_STAGE_ID)
      const targetIndex = columns.findIndex((column) => column.id === targetStageId)
      const isAfterLicenziamento =
        licenziamentoIndex >= 0 && targetIndex > licenziamentoIndex

      if (movingCard && isAfterLicenziamento) {
        const missing: string[] = []
        if (!movingCard.hasAssunzioneLavoratore) missing.push("assunzione lavoratore")
        if (!movingCard.hasAssunzioneDatore) missing.push("assunzione datore")
        if (missing.length > 0) {
          toast.error(`Mancano i dati di: ${missing.join(" e ")}`)
          return
        }
      }

      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [columns, moveMutation]
  )

  const patchMutation = usePatchMutation<
    { recordId: string; patch: Partial<ChiusuraContrattoRecord> },
    unknown,
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("chiusure_contratti", recordId, patch),
    applyOptimistic: (previous, { recordId, patch }) => {
      setMutationError(null)
      if (!previous) return previous
      return {
        ...previous,
        columns: applyChiusuraPatchInColumns(previous.columns, recordId, patch),
      }
    },
  })
  React.useEffect(() => {
    if (patchMutation.error) {
      setMutationError(formatErrorMessage(patchMutation.error, "Errore aggiornando chiusura"))
    }
  }, [patchMutation.error])

  const patchChiusura = React.useCallback(
    async (recordId: string, patch: Partial<ChiusuraContrattoRecord>) => {
      await patchMutation.mutateAsync({ recordId, patch })
    },
    [patchMutation]
  )

  const createChiusura = React.useCallback(
    async (input: {
      rapportoId: string
      tipo: "licenziamento" | "dimissione" | "annullamento"
      dataFineRapporto: string
      note: string
    }) => {
      setMutationError(null)
      const stage =
        input.tipo === "dimissione"
          ? "Lavoratore comunica dimissioni"
          : input.tipo === "licenziamento"
            ? "Datore comunica licenziamento"
            : "Chiusura elaborata"
      try {
        const response = await createRecord("chiusure_contratti", {
          stato: stage,
          data_fine_rapporto: input.dataFineRapporto || null,
          tipo_licenziamento:
            input.tipo === "licenziamento"
              ? "Licenziamento"
              : input.tipo === "annullamento"
                ? "Annullamento contratto"
                : null,
          motivazione_cessazione_rapporto:
            input.tipo === "dimissione" ? "Dimissioni" : input.note || null,
          informazioni_aggiuntive: input.note || null,
        })
        const record = response.row as ChiusuraContrattoRecord
        await updateRecord("rapporti_lavorativi", input.rapportoId, {
          fine_rapporto_lavorativo_id: record.id,
        })
      } catch (caughtError) {
        setMutationError(formatErrorMessage(caughtError, "Errore creando chiusura"))
        throw caughtError
      } finally {
        await invalidateBoard()
      }
    },
    [invalidateBoard]
  )

  const linkRapporto = React.useCallback(
    async (chiusuraId: string, rapportoId: string | null) => {
      setMutationError(null)
      const previous = queryClient.getQueryData<ChiusureBoardData>(CHIUSURE_BOARD_QUERY_KEY)

      // Resolve the chiusura's previously linked rapporto from the cache so we
      // can unlink it server-side too.
      let previousRapportoId: string | null = null
      if (previous) {
        for (const column of previous.columns) {
          for (const card of column.cards) {
            if (card.id === chiusuraId && card.rapporto) {
              previousRapportoId = card.rapporto.id
            }
          }
        }
      }

      try {
        if (rapportoId) {
          if (previousRapportoId && previousRapportoId !== rapportoId) {
            await updateRecord("rapporti_lavorativi", previousRapportoId, {
              fine_rapporto_lavorativo_id: null,
            })
          }
          await updateRecord("rapporti_lavorativi", rapportoId, {
            fine_rapporto_lavorativo_id: chiusuraId,
          })
        } else if (previousRapportoId) {
          await updateRecord("rapporti_lavorativi", previousRapportoId, {
            fine_rapporto_lavorativo_id: null,
          })
        }
      } catch (caughtError) {
        setMutationError(formatErrorMessage(caughtError, "Errore collegando rapporto"))
        throw caughtError
      } finally {
        await invalidateBoard()
      }
    },
    [queryClient, invalidateBoard]
  )

  // Optimistic in-memory updater backed by the React Query cache. Kept so
  // legacy callers (e.g. attachment upload/remove) can still patch a card
  // without going through a full mutation. Memoised so consumers that put it
  // in effect dependencies don't re-render-loop.
  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
    ) => {
      setBoardData((current) => {
        if (!current) return current
        return {
          ...current,
          columns: updateCardInColumns(current.columns, recordId, updater),
        }
      })
    },
    [setBoardData]
  )

  const deleteMutation = useDeleteBoardRecordMutation<
    { recordId: string },
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    table: "chiusure_contratti",
    getRecordId: ({ recordId }) => recordId,
    applyOptimistic: (previous, { recordId }) => {
      if (!previous) return previous
      return {
        ...previous,
        columns: previous.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== recordId),
        })),
      }
    },
  })

  const deleteChiusura = React.useCallback(
    async (recordId: string) => {
      await deleteMutation.mutateAsync({ recordId })
    },
    [deleteMutation],
  )

  // Realtime → invalidate the query. React Query then refetches the board
  // and re-renders consumers. The orchestrator still debounces and defers
  // while local writes are pending so we don't clobber optimistic state.
  useRealtimeBoardSync({
    tables: [...CHIUSURE_REALTIME_TABLES],
    reload: invalidateBoard,
  })

  const error =
    mutationError ??
    (queryError ? formatErrorMessage(queryError, "Errore caricamento chiusure") : null)

  return {
    loading: isLoading,
    error,
    columns,
    rapportoOptions,
    tipoLicenziamentoOptions,
    createChiusura,
    linkRapporto,
    moveCard,
    patchChiusura,
    updateCard,
    deleteChiusura,
  }
}
