import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import {
  countVariazioniBoardCards,
  filterVariazioniBoardColumns,
  formatVariazioneBoardDate,
} from "../lib"
import { fetchVariazioniByIds } from "../queries/fetch-variazioni-by-ids"
import type { VariazioniBoardCardData, VariazioniBoardDragHandlers } from "../types"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti/queries"
import { useVariazioniBoard } from "./use-variazioni-board"

export function useVariazioniBoardView() {
  const {
    loading,
    error,
    columns,
    rapportoOptions,
    createVariazione,
    moveCard,
    updateCard,
    detailRefreshTick,
    setOpenDetailIdsForRealtime,
  } = useVariazioniBoard()

  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedFreshCard, setSelectedFreshCard] =
    React.useState<VariazioniBoardCardData | null>(null)
  const selectedCardRequestRef = React.useRef<string | null>(null)
  const selectedFreshCardRef = React.useRef<VariazioniBoardCardData | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  React.useEffect(() => {
    selectedFreshCardRef.current = selectedFreshCard
  }, [selectedFreshCard])

  React.useEffect(() => {
    setOpenDetailIdsForRealtime([
      selectedCardId,
      selectedFreshCard?.id,
      selectedFreshCard?.rapporto?.id,
      selectedFreshCard?.rapporto?.famiglia_id,
      selectedFreshCard?.rapporto?.lavoratore_id,
    ])
    return () => setOpenDetailIdsForRealtime([])
  }, [selectedCardId, selectedFreshCard, setOpenDetailIdsForRealtime])

  const filteredColumns = React.useMemo(
    () => filterVariazioniBoardColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalVariazioni = React.useMemo(
    () => countVariazioniBoardCards(filteredColumns),
    [filteredColumns],
  )

  const selectedBoardCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  )

  const handleSelectCard = React.useCallback((card: VariazioniBoardCardData) => {
    selectedCardRequestRef.current = card.id
    setSelectedCardId(card.id)
    // Keep the list card as provisional detail so comment route context stays
    // mounted while dettaglio + ricerca enrichment load.
    setSelectedFreshCard(card)
  }, [])

  // Pattern B — re-fetch open sheet when selection opens or detailRefreshTick
  // bumps after realtime.
  React.useEffect(() => {
    if (!selectedCardId) {
      setSelectedFreshCard(null)
      return
    }

    let isActive = true
    const currentCardId = selectedCardId
    const boardCard = selectedBoardCard
    const provisional =
      selectedFreshCardRef.current?.id === currentCardId
        ? selectedFreshCardRef.current
        : boardCard

    if (boardCard) {
      setSelectedFreshCard(boardCard)
    }

    async function loadSelectedCard() {
      try {
        const rapportoId = boardCard?.rapporto?.id ?? provisional?.rapporto?.id ?? null
        const [recordResponse, rapportoResponse] = await Promise.all([
          fetchVariazioniByIds([currentCardId]),
          rapportoId
            ? fetchRapportiLavorativiByIds([rapportoId])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ])

        if (!isActive || selectedCardRequestRef.current !== currentCardId) return

        const freshRecord = recordResponse.rows[0] as VariazioniBoardCardData["record"] | undefined
        const baseCard = boardCard ?? provisional
        if (!freshRecord) {
          if (!boardCard && !provisional) setSelectedFreshCard(null)
          return
        }
        if (!baseCard) return

        const enrichedRapporto = await enrichRapportoWithRicercaId(
          (rapportoResponse.rows[0] as VariazioniBoardCardData["rapporto"]) ?? baseCard.rapporto,
        )

        if (!isActive || selectedCardRequestRef.current !== currentCardId) return

        const nextCard: VariazioniBoardCardData = {
          ...baseCard,
          record: freshRecord,
          rapporto: enrichedRapporto,
          variazioneDaApplicare:
            freshRecord.variazione_da_applicare ?? baseCard.variazioneDaApplicare,
          dataVariazione: formatVariazioneBoardDate(freshRecord.data_variazione),
        }

        setSelectedFreshCard(nextCard)
        updateCard(currentCardId, () => nextCard)
      } catch (fetchError) {
        if (!isActive) return
        console.error("Errore caricando dettaglio variazione", fetchError)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boardCard snapshot read on id/tick only
  }, [selectedCardId, selectedBoardCard?.id, detailRefreshTick, updateCard])

  const drag = React.useMemo<VariazioniBoardDragHandlers>(
    () => ({
      draggingRecordId,
      dropTargetColumnId,
      onDragStartCard: setDraggingRecordId,
      onDragEndCard: () => {
        window.setTimeout(() => {
          setDraggingRecordId(null)
          setDropTargetColumnId(null)
        }, 0)
      },
      onDragEnterColumn: setDropTargetColumnId,
      onDragOverColumn: setDropTargetColumnId,
      onDragLeaveColumn: (columnId) => {
        setDropTargetColumnId((current) => (current === columnId ? null : current))
      },
      onDropToColumn: (columnId, recordId) => {
        setDropTargetColumnId(null)
        setDraggingRecordId(null)
        if (!recordId) return
        void moveCard(recordId, columnId)
      },
    }),
    [draggingRecordId, dropTargetColumnId, moveCard],
  )

  const sheetProps = React.useMemo(
    () => ({
      key: selectedCardId ?? "__empty__",
      card: selectedFreshCard,
      open: Boolean(selectedCardId),
      onCardChange: (nextCard: VariazioniBoardCardData) => {
        updateCard(nextCard.id, () => nextCard)
        setSelectedFreshCard(nextCard)
      },
      onOpenChange: (open: boolean) => {
        if (!open) {
          selectedCardRequestRef.current = null
          setSelectedCardId(null)
          setSelectedFreshCard(null)
        }
      },
    }),
    [selectedCardId, selectedFreshCard, updateCard],
  )

  const createDialogProps = React.useMemo(
    () => ({
      open: isCreateDialogOpen,
      onOpenChange: setIsCreateDialogOpen,
      rapportoOptions,
      onCreate: createVariazione,
    }),
    [createVariazione, isCreateDialogOpen, rapportoOptions],
  )

  return {
    loading,
    error,
    filteredColumns,
    totalVariazioni,
    searchValue,
    setSearchValue,
    drag,
    selectCard: handleSelectCard,
    sheetProps,
    createDialogProps,
    openCreateDialog: () => setIsCreateDialogOpen(true),
  }
}
