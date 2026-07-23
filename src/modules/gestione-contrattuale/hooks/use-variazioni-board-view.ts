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
  const { loading, error, columns, rapportoOptions, createVariazione, moveCard, updateCard } =
    useVariazioniBoard()

  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedFreshCard, setSelectedFreshCard] =
    React.useState<VariazioniBoardCardData | null>(null)
  const selectedCardRequestRef = React.useRef<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  const filteredColumns = React.useMemo(
    () => filterVariazioniBoardColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalVariazioni = React.useMemo(
    () => countVariazioniBoardCards(filteredColumns),
    [filteredColumns],
  )

  const handleSelectCard = React.useCallback(
    async (card: VariazioniBoardCardData) => {
      selectedCardRequestRef.current = card.id
      setSelectedCardId(card.id)
      // Keep the list card as provisional detail so comment route context stays
      // mounted while dettaglio + ricerca enrichment load.
      setSelectedFreshCard(card)

      try {
        const [recordResponse, rapportoResponse] = await Promise.all([
          fetchVariazioniByIds([card.id]),
          card.rapporto?.id
            ? fetchRapportiLavorativiByIds([card.rapporto.id])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ])

        if (selectedCardRequestRef.current !== card.id) return

        const freshRecord = recordResponse.rows[0]
        if (!freshRecord) {
          setSelectedFreshCard(card)
          return
        }

        const enrichedRapporto = await enrichRapportoWithRicercaId(
          (rapportoResponse.rows[0] as VariazioniBoardCardData["rapporto"]) ?? card.rapporto,
        )

        if (selectedCardRequestRef.current !== card.id) return

        const nextCard: VariazioniBoardCardData = {
          ...card,
          record: freshRecord as VariazioniBoardCardData["record"],
          rapporto: enrichedRapporto,
          variazioneDaApplicare:
            (freshRecord as VariazioniBoardCardData["record"]).variazione_da_applicare ??
            card.variazioneDaApplicare,
          dataVariazione: formatVariazioneBoardDate(
            (freshRecord as VariazioniBoardCardData["record"]).data_variazione,
          ),
        }

        setSelectedFreshCard(nextCard)
        updateCard(card.id, () => nextCard)
      } catch (fetchError) {
        console.error("Errore caricando dettaglio variazione", fetchError)
      }
    },
    [updateCard],
  )

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
