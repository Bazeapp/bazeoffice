import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useDeleteBoardRecordMutation, useMoveMutation } from "@/hooks/use-board-mutations"

import {
  applyOptimisticCardMove,
  updateCardAndRehome,
} from "@/lib/board-column-utils"
import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { normalizeComparableToken } from "@/lib/value-utils"
import { updateRecord } from "@/lib/record-crud"
import { mapAssunzioniBoardCard } from "../lib/assunzioni-board"
import { fetchAssunzioniBoard } from "../queries/fetch-assunzioni-board"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData } from "../types"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const ASSUNZIONI_REALTIME_TABLES = [
  "assunzioni",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
  "processi_matching",
  "richieste_attivazione",
]
type AssunzioniStageDefinition = {
  id: string
  label: string
  color: string
}

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

const DEFAULT_STAGE_DEFINITIONS: AssunzioniStageDefinition[] = [
  { id: "Avviare pratica", label: "Avviare pratica", color: "sky" },
  { id: "Inviata richiesta dati", label: "Inviata richiesta dati", color: "sky" },
  { id: "In attesa di dati famiglia", label: "In attesa di dati famiglia", color: "teal" },
  { id: "In attesa di dati lavoratore", label: "In attesa di dati lavoratore", color: "teal" },
  { id: "Dati pronti per assunzione", label: "Dati pronti per assunzione", color: "amber" },
  { id: "Assunzione fatta", label: "Assunzione fatta", color: "lime" },
  { id: "Documenti assunzione inviati", label: "Documenti assunzione inviati", color: "green" },
  { id: "Contratto firmato", label: "Contratto firmato", color: "green" },
  { id: "Non assume con Baze", label: "Non assume con Baze", color: "orange" },
]

const DEFERRED_STAGE_IDS = new Set(["Contratto firmato", "Non assume con Baze"])

type FetchAssunzioniBoardDataOptions = {
  deferredLoadedStageIds?: Set<string>
  onlyStageId?: string
  /**
   * Lazy lookup for the previous card by rapporto id. Read AT mapping time
   * (NOT at queryFn start) so any concurrent `setQueryData` from
   * `handleSelectCard` / `updateCard` is observed and detail-only fields
   * are merged in. Reading a snapshot at queryFn start would race against
   * a parallel detail fetch and reinstate stale empty sub-objects.
   */
  getPreviousCard?: (rapportoId: string) => AssunzioniBoardCardData | undefined
}

async function fetchAssunzioniBoardData({
  deferredLoadedStageIds = new Set<string>(),
  onlyStageId,
  getPreviousCard,
}: FetchAssunzioniBoardDataOptions = {}): Promise<AssunzioniBoardColumnData[]> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchAssunzioniBoard(onlyStageId ?? null),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "processi_matching",
    entityField: "stato_assunzione",
  })
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, AssunzioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.rows) {
    const linkedRapporto = row.rapporto
    if (!linkedRapporto) continue

    const processStage = aliases.get(normalizeComparableToken(linkedRapporto.stato_assunzione))
    if (!processStage) continue

    const previousCard = getPreviousCard?.(linkedRapporto.id)
    const card = mapAssunzioniBoardCard(row, processStage, previousCard)
    if (!card) continue

    cardsByStage.get(processStage)?.push(card)
  }

  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
    deferred: DEFERRED_STAGE_IDS.has(stage.id),
    loadError: null,
    loaded: !DEFERRED_STAGE_IDS.has(stage.id) || deferredLoadedStageIds.has(stage.id),
    loading: false,
  }))
}

const ASSUNZIONI_BOARD_QUERY_KEY = ["assunzioni-board"] as const

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
      const getPreviousCard = (rapportoId: string) => {
        const latest = queryClient.getQueryData<AssunzioniBoardColumnData[]>(
          ASSUNZIONI_BOARD_QUERY_KEY,
        )
        if (!latest) return undefined
        for (const column of latest) {
          const card = column.cards.find((c) => c.id === rapportoId)
          if (card) return card
        }
        return undefined
      }

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
      if (!DEFERRED_STAGE_IDS.has(stageId) || loadedDeferredStageIdsRef.current.has(stageId)) return

      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === stageId ? { ...column, loadError: null, loading: true } : column,
        ),
      )

      try {
        const loadedColumns = await fetchAssunzioniBoardData({
          deferredLoadedStageIds: new Set([stageId]),
          onlyStageId: stageId,
          getPreviousCard: (rapportoId: string) => {
            const latest = queryClient.getQueryData<AssunzioniBoardColumnData[]>(
              ASSUNZIONI_BOARD_QUERY_KEY,
            )
            if (!latest) return undefined
            for (const column of latest) {
              const card = column.cards.find((c) => c.id === rapportoId)
              if (card) return card
            }
            return undefined
          },
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
    tables: ASSUNZIONI_REALTIME_TABLES,
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
