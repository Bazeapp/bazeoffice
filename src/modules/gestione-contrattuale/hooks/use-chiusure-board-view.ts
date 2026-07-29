import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import {
  countChiusureBoardCards,
  filterChiusureBoardColumns,
  formatChiusuraBoardDate,
  resolveChiusuraTipoDisplay,
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
    tipoMetadata,
    createChiusura,
    linkRapporto,
    moveCard,
    updateCard,
    patchChiusura,
    deleteChiusura,
    detailRefreshTick,
  } = useChiusureBoard()

  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedFreshCard, setSelectedFreshCard] = React.useState<ChiusureBoardCardData | null>(null)
  const selectedCardRequestRef = React.useRef<string | null>(null)
  const selectedFreshCardRef = React.useRef<ChiusureBoardCardData | null>(null)
  const tipoMetadataRef = React.useRef(tipoMetadata)
  const [searchValue, setSearchValue] = React.useState("")
  const [isAnnullamentoDialogOpen, setIsAnnullamentoDialogOpen] = React.useState(false)

  React.useEffect(() => {
    selectedFreshCardRef.current = selectedFreshCard
  }, [selectedFreshCard])

  React.useEffect(() => {
    tipoMetadataRef.current = tipoMetadata
  }, [tipoMetadata])

  const filteredColumns = React.useMemo(
    () => filterChiusureBoardColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalChiusure = React.useMemo(
    () => countChiusureBoardCards(filteredColumns),
    [filteredColumns],
  )

  const selectedBoardCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  )

  const handleSelectCard = React.useCallback((card: ChiusureBoardCardData) => {
    selectedCardRequestRef.current = card.id
    setSelectedCardId(card.id)
    // Keep the list card as provisional detail so comment route context stays
    // mounted while dettaglio + ricerca enrichment load.
    setSelectedFreshCard(card)
  }, [])

  // Pattern B — re-fetch open sheet when selection opens or detailRefreshTick
  // bumps after realtime. Board card object identity is intentionally omitted
  // so ordinary board refreshes alone do not thrash the sheet.
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
          fetchChiusureByIds([currentCardId]),
          rapportoId
            ? fetchRapportiLavorativiByIds([rapportoId])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ])

        if (!isActive || selectedCardRequestRef.current !== currentCardId) return

        const freshRecord = recordResponse.rows[0] as ChiusureBoardCardData["record"] | undefined
        const baseCard = boardCard ?? provisional
        if (!freshRecord) {
          if (!boardCard && !provisional) setSelectedFreshCard(null)
          return
        }
        if (!baseCard) return

        const enrichedRapporto = await enrichRapportoWithRicercaId(
          (rapportoResponse.rows[0] as ChiusureBoardCardData["rapporto"]) ?? baseCard.rapporto,
        )

        if (!isActive || selectedCardRequestRef.current !== currentCardId) return

        const nextCard: ChiusureBoardCardData = {
          ...baseCard,
          record: freshRecord,
          rapporto: enrichedRapporto,
          motivazione: freshRecord.motivazione_cessazione_rapporto ?? baseCard.motivazione,
          dataFineRapporto: formatChiusuraBoardDate(freshRecord.data_fine_rapporto),
          ...resolveChiusuraTipoDisplay(freshRecord, tipoMetadataRef.current),
        }

        setSelectedFreshCard(nextCard)
        updateCard(currentCardId, () => nextCard)
      } catch (fetchError) {
        if (!isActive) return
        console.error("Errore caricando dettaglio chiusura", fetchError)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boardCard snapshot read on id/tick only
  }, [selectedCardId, selectedBoardCard?.id, detailRefreshTick, updateCard])

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
      tipoMetadata,
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
      tipoMetadata,
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
