import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import {
  countChiusureBoardCards,
  filterChiusureBoardColumns,
  formatChiusuraBoardDate,
} from "../lib"
import { fetchChiusureByIds } from "../queries/fetch-chiusure-by-ids"
import type { ChiusureBoardCardData, ChiusureBoardDragHandlers } from "../types"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti/queries"
import { useChiusureBoard } from "./use-chiusure-board"

export function useChiusureBoardView() {
  const {
    loading,
    error,
    columns,
    rapportoOptions,
    tipoLicenziamentoOptions,
    createChiusura,
    linkRapporto,
    moveCard,
    updateCard,
    patchChiusura,
    deleteChiusura,
  } = useChiusureBoard()

  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedFreshCard, setSelectedFreshCard] = React.useState<ChiusureBoardCardData | null>(null)
  const selectedCardRequestRef = React.useRef<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [isAnnullamentoDialogOpen, setIsAnnullamentoDialogOpen] = React.useState(false)

  const filteredColumns = React.useMemo(
    () => filterChiusureBoardColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalChiusure = React.useMemo(
    () => countChiusureBoardCards(filteredColumns),
    [filteredColumns],
  )

  const handleSelectCard = React.useCallback(
    async (card: ChiusureBoardCardData) => {
      selectedCardRequestRef.current = card.id
      setSelectedCardId(card.id)
      // Keep the list card as provisional detail so comment route context stays
      // mounted while dettaglio + ricerca enrichment load.
      setSelectedFreshCard(card)

      try {
        const [recordResponse, rapportoResponse] = await Promise.all([
          fetchChiusureByIds([card.id]),
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
          (rapportoResponse.rows[0] as ChiusureBoardCardData["rapporto"]) ?? card.rapporto,
        )

        if (selectedCardRequestRef.current !== card.id) return

        const nextCard: ChiusureBoardCardData = {
          ...card,
          record: freshRecord as ChiusureBoardCardData["record"],
          rapporto: enrichedRapporto,
          motivazione:
            (freshRecord as ChiusureBoardCardData["record"]).motivazione_cessazione_rapporto ??
            card.motivazione,
          dataFineRapporto: formatChiusuraBoardDate(
            (freshRecord as ChiusureBoardCardData["record"]).data_fine_rapporto,
          ),
        }

        setSelectedFreshCard(nextCard)
        updateCard(card.id, () => nextCard)
      } catch (fetchError) {
        console.error("Errore caricando dettaglio chiusura", fetchError)
      }
    },
    [updateCard],
  )

  const drag = React.useMemo<ChiusureBoardDragHandlers>(
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
      columns,
      rapportoOptions,
      tipoLicenziamentoOptions,
      open: Boolean(selectedCardId),
      onStatusChange: moveCard,
      onLinkRapporto: linkRapporto,
      onPatchChiusura: patchChiusura,
      onCardChange: (nextCard: ChiusureBoardCardData) => {
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
      onDeleteChiusura: deleteChiusura,
    }),
    [
      columns,
      deleteChiusura,
      linkRapporto,
      moveCard,
      patchChiusura,
      rapportoOptions,
      selectedCardId,
      selectedFreshCard,
      tipoLicenziamentoOptions,
      updateCard,
    ],
  )

  const annullamentoDialogProps = React.useMemo(
    () => ({
      open: isAnnullamentoDialogOpen,
      onOpenChange: setIsAnnullamentoDialogOpen,
      rapportoOptions,
      onCreate: async ({
        rapportoId,
        dataFineRapporto,
      }: {
        rapportoId: string
        dataFineRapporto: string
      }) => {
        await createChiusura({
          rapportoId,
          tipo: "annullamento",
          dataFineRapporto,
          note: "",
        })
      },
    }),
    [createChiusura, isAnnullamentoDialogOpen, rapportoOptions],
  )

  return {
    loading,
    error,
    filteredColumns,
    totalChiusure,
    searchValue,
    setSearchValue,
    drag,
    selectCard: handleSelectCard,
    sheetProps,
    annullamentoDialogProps,
    openAnnullamentoDialog: () => setIsAnnullamentoDialogOpen(true),
  }
}
