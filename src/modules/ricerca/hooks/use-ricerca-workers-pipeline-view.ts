import * as React from "react"
import { toast } from "sonner"

import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import { createRecord } from "@/lib/record-crud"
import { runSmartMatchingForwardPreview } from "@/lib/smart-matching-forward"
import { asString } from "@/modules/lavoratori/lib"
import { fetchLavoratoriSearch } from "../queries/fetch-lavoratori-search"
import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import type { RicercaWorkerSelectionColumn } from "../types"
import {
  ADD_WORKER_SEARCH_FETCH_LIMIT,
  ADD_WORKER_SEARCH_LIMIT,
  buildWorkerSearchHaystack,
  filterPipelineColumnsBySearch,
  scoreWorkerSearchResult,
  tokenizeWorkerSearchQuery,
  workerMatchesCombinedQuery,
} from "../lib/worker-pipeline-view-utils"

export type UseRicercaWorkersPipelineViewParams = {
  processId: string
  columns: RicercaWorkerSelectionColumn[]
  moveCard: (selectionId: string, targetStatusId: string) => Promise<void>
  refresh: () => void
}

export function useRicercaWorkersPipelineView({
  processId,
  columns,
  moveCard,
  refresh,
}: UseRicercaWorkersPipelineViewParams) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isRunningSmartMatching, setIsRunningSmartMatching] = React.useState(false)
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = React.useState(false)
  const [workerSearchQuery, setWorkerSearchQuery] = React.useState("")
  const [workerSearchResults, setWorkerSearchResults] = React.useState<
    Record<string, unknown>[]
  >([])
  const [isWorkerSearchLoading, setIsWorkerSearchLoading] = React.useState(false)
  const [selectedWorkerToAdd, setSelectedWorkerToAdd] = React.useState<Record<
    string,
    unknown
  > | null>(null)
  const [manualInsertReason, setManualInsertReason] = React.useState("")
  const [isSubmittingAddWorker, setIsSubmittingAddWorker] = React.useState(false)
  const [draggingSelectionId, setDraggingSelectionId] = React.useState<string | null>(null)
  const [draggingFromColumnId, setDraggingFromColumnId] = React.useState<string | null>(
    null,
  )
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)

  const totalWorkers = React.useMemo(
    () => columns.reduce((sum, column) => sum + column.cards.length, 0),
    [columns],
  )

  const filteredColumns = React.useMemo(
    () => filterPipelineColumnsBySearch(columns, searchQuery),
    [columns, searchQuery],
  )

  const updateDropTargetColumnId = React.useCallback((next: string | null) => {
    setDropTargetColumnId((current) => (current === next ? current : next))
  }, [])

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedSelectionId: string | null) => {
      const selectionId = droppedSelectionId || draggingSelectionId
      setDropTargetColumnId(null)
      setDraggingSelectionId(null)
      setDraggingFromColumnId(null)
      if (!selectionId) return
      void moveCard(selectionId, columnId)
    },
    [draggingSelectionId, moveCard],
  )

  const handleDragLeaveColumn = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const stillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (stillInside) return
      updateDropTargetColumnId(null)
    },
    [updateDropTargetColumnId],
  )

  const onDragStartCard = React.useCallback(
    (selectionId: string, sourceColumnId: string) => {
      setDraggingSelectionId(selectionId)
      setDraggingFromColumnId(sourceColumnId)
    },
    [],
  )

  const onDragEndCard = React.useCallback(() => {
    setDraggingSelectionId(null)
    setDraggingFromColumnId(null)
    setDropTargetColumnId(null)
  }, [])

  React.useEffect(() => {
    if (!isAddWorkerDialogOpen) {
      setWorkerSearchQuery("")
      setWorkerSearchResults([])
      setSelectedWorkerToAdd(null)
      setManualInsertReason("")
      setIsWorkerSearchLoading(false)
      return
    }

    const normalizedQuery = workerSearchQuery.trim()
    if (normalizedQuery.length < 2) {
      setWorkerSearchResults([])
      setIsWorkerSearchLoading(false)
      return
    }

    let cancelled = false
    setIsWorkerSearchLoading(true)

    const timeoutId = window.setTimeout(() => {
      const tokens = tokenizeWorkerSearchQuery(normalizedQuery)
      const searchTerms = Array.from(
        new Set([normalizedQuery, ...tokens].filter(Boolean)),
      )
      void Promise.all(
        searchTerms.map((searchTerm) =>
          fetchLavoratoriSearch(searchTerm, ADD_WORKER_SEARCH_FETCH_LIMIT),
        ),
      )
        .then((results) => {
          if (cancelled) return
          const rowsById = new Map<string, Record<string, unknown>>()
          for (const result of results) {
            for (const row of result.rows ?? []) {
              if (!row || typeof row !== "object") continue
              const rowId = asString(row.id)
              if (!rowId || rowsById.has(rowId)) continue
              rowsById.set(rowId, row as Record<string, unknown>)
            }
          }

          const rows = Array.from(rowsById.values())
            .filter((row) => workerMatchesCombinedQuery(row, tokens))
            .sort((left, right) => {
              const scoreDelta =
                scoreWorkerSearchResult(left, normalizedQuery) -
                scoreWorkerSearchResult(right, normalizedQuery)
              if (scoreDelta !== 0) return scoreDelta
              return buildWorkerSearchHaystack(left).localeCompare(
                buildWorkerSearchHaystack(right),
                "it",
              )
            })
            .slice(0, ADD_WORKER_SEARCH_LIMIT)

          setWorkerSearchResults(rows)
        })
        .catch(() => {
          if (cancelled) return
          setWorkerSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setIsWorkerSearchLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isAddWorkerDialogOpen, workerSearchQuery])

  const handleRunSmartMatching = React.useCallback(async () => {
    if (!processId) {
      toast.error("Il processo non ha id")
      return
    }
    setIsRunningSmartMatching(true)
    try {
      const result = await runSmartMatchingForwardPreview(processId)
      const selectedCount =
        typeof result.selected_count === "number"
          ? result.selected_count
          : (result.selected_workers?.length ?? 0)

      toast.success(
        `Smart Matching completato: ${selectedCount} ${
          selectedCount === 1 ? "lavoratore trovato" : "lavoratori trovati"
        }`,
      )
      refresh()
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore avvio Smart Matching",
      )
    } finally {
      setIsRunningSmartMatching(false)
    }
  }, [processId, refresh])

  const handleAddWorkerToSearch = React.useCallback(async () => {
    const workerId =
      typeof selectedWorkerToAdd?.id === "string" ||
      typeof selectedWorkerToAdd?.id === "number"
        ? String(selectedWorkerToAdd.id)
        : null
    const reason = manualInsertReason.trim()

    if (!processId || !workerId) {
      toast.error("Seleziona un lavoratore")
      return
    }
    if (!reason) {
      toast.error("La motivazione è obbligatoria")
      return
    }

    setIsSubmittingAddWorker(true)
    try {
      const existingSelections = await fetchSelezioniLookup({
        processoIds: [processId],
        lavoratoreIds: [workerId],
      })

      if ((existingSelections.rows ?? []).length > 0) {
        throw new Error("Lavoratore già presente in questa ricerca")
      }

      await createRecord("selezioni_lavoratori", {
        processo_matching_id: processId,
        lavoratore_id: workerId,
        stato_selezione: "Prospetto",
        motivo_inserimento_manuale: reason,
        source: "manuale",
      })
      await invokeWorkerAvailabilityForIds(
        getSelectionAvailabilityWorkerIds(null, {
          processo_matching_id: processId,
          lavoratore_id: workerId,
          stato_selezione: "Prospetto",
        }),
      )

      setIsAddWorkerDialogOpen(false)
      refresh()
      toast.success("Lavoratore aggiunto in Prospetto")
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore aggiungendo il lavoratore",
      )
    } finally {
      setIsSubmittingAddWorker(false)
    }
  }, [processId, manualInsertReason, selectedWorkerToAdd, refresh])

  return {
    searchQuery,
    setSearchQuery,
    totalWorkers,
    filteredColumns,
    isRunningSmartMatching,
    handleRunSmartMatching,
    isAddWorkerDialogOpen,
    setIsAddWorkerDialogOpen,
    workerSearchQuery,
    setWorkerSearchQuery,
    workerSearchResults,
    isWorkerSearchLoading,
    selectedWorkerToAdd,
    setSelectedWorkerToAdd,
    manualInsertReason,
    setManualInsertReason,
    isSubmittingAddWorker,
    handleAddWorkerToSearch,
    draggingSelectionId,
    draggingFromColumnId,
    dropTargetColumnId,
    updateDropTargetColumnId,
    handleDropToColumn,
    handleDragLeaveColumn,
    onDragStartCard,
    onDragEndCard,
  }
}
