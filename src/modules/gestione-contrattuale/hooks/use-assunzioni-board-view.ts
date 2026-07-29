import * as React from "react"
import { toast } from "sonner"

import { resolveDeepLinkSelection } from "../lib/deep-link-selection"
import {
  countAssunzioniBoardProcesses,
  filterAssunzioniBoardColumns,
} from "../lib/assunzioni-board-search"
import { fetchAssunzioneDetail } from "../queries/fetch-assunzione-detail"
import type { AssunzioniBoardCardData, AssunzioniBoardDragHandlers } from "../types"
import { useAssunzioniBoard } from "./use-assunzioni-board"

type UseAssunzioniBoardViewOptions = {
  /**
   * BAZ-20: deep-link dalla card "Datore" del rapporto. È un id di
   * `rapporti_lavorativi` — il board Assunzioni è indicizzato per rapporto id
   * (`card.id === rapporto.id`), quindi combacia direttamente senza lookup.
   */
  initialSelectedRapportoId?: string | null
}

export function useAssunzioniBoardView({
  initialSelectedRapportoId = null,
}: UseAssunzioniBoardViewOptions = {}) {
  const {
    loading,
    error,
    columns,
    loadDeferredColumn,
    moveCard,
    updateCard,
    deleteRapporto,
    detailRefreshTick,
  } = useAssunzioniBoard()

  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedCard, setSelectedCard] = React.useState<AssunzioniBoardCardData | null>(null)
  const selectedCardRequestRef = React.useRef<string | null>(null)
  const selectedCardRef = React.useRef<AssunzioniBoardCardData | null>(null)
  const [searchValue, setSearchValue] = React.useState("")

  React.useEffect(() => {
    selectedCardRef.current = selectedCard
  }, [selectedCard])

  const filteredColumns = React.useMemo(
    () => filterAssunzioniBoardColumns(columns, searchValue),
    [columns, searchValue],
  )

  const totalProcesses = React.useMemo(
    () => countAssunzioniBoardProcesses(filteredColumns),
    [filteredColumns],
  )

  const selectedBoardCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  )

  const handleSelectCard = React.useCallback((card: AssunzioniBoardCardData) => {
    selectedCardRequestRef.current = card.id
    setSelectedCardId(card.id)
    // Keep the list card as provisional detail so comment route context (and
    // the messages pill) stay mounted while `assunzione_detail` loads.
    setSelectedCard(card)
  }, [])

  // Pattern B — re-fetch open sheet when selection opens or detailRefreshTick
  // bumps after realtime. Deliberately do NOT depend on `columns` identity:
  // optimistic updates would re-trigger fetch → updateCard → loop.
  React.useEffect(() => {
    if (!selectedCardId) {
      setSelectedCard(null)
      return
    }

    let isActive = true
    const currentCardId = selectedCardId
    const boardCard = selectedBoardCard
    const provisional =
      selectedCardRef.current?.id === currentCardId ? selectedCardRef.current : boardCard

    if (boardCard) {
      setSelectedCard(boardCard)
    }

    async function loadSelectedCard() {
      try {
        const detail = await fetchAssunzioneDetail(currentCardId)
        if (!isActive || selectedCardRequestRef.current !== currentCardId) return

        const baseCard = boardCard ?? provisional
        if (!detail) {
          if (baseCard) setSelectedCard(baseCard)
          return
        }
        if (!baseCard) return

        const nextCard: AssunzioniBoardCardData = {
          ...baseCard,
          rapporto: (detail.rapporto as AssunzioniBoardCardData["rapporto"]) ?? baseCard.rapporto,
          assunzione:
            (detail.assunzione as AssunzioniBoardCardData["assunzione"]) ?? baseCard.assunzione,
          lavoratoreAssunzione:
            (detail.lavoratoreAssunzione as AssunzioniBoardCardData["lavoratoreAssunzione"]) ??
            baseCard.lavoratoreAssunzione,
          richiestaAttivazione:
            (detail.richiestaAttivazione as AssunzioniBoardCardData["richiestaAttivazione"]) ??
            baseCard.richiestaAttivazione,
        }

        setSelectedCard(nextCard)
        updateCard(nextCard.id, () => nextCard)
      } catch (fetchError) {
        if (!isActive) return
        console.error("Errore caricando dettaglio assunzione", fetchError)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boardCard snapshot read on id/tick only
  }, [selectedCardId, selectedBoardCard?.id, detailRefreshTick, updateCard])

  const autoSelectDoneRef = React.useRef<string | null>(null)
  const deferredKickedRef = React.useRef<string | null>(null)

  // BAZ-20: deep-link dalla card "Datore". Auto-seleziona la card del rapporto
  // UNA sola volta per id. La guardia è sull'id via ref (NON sull'identità di
  // `columns`, per non riaprire l'anti-pattern del loop descritto sopra). La
  // decisione (seleziona / carica colonne deferred / nessuna assunzione) è nel
  // helper puro `resolveDeepLinkSelection` così è testabile senza renderizzare.
  React.useEffect(() => {
    const targetId = initialSelectedRapportoId
    if (!targetId) return
    if (autoSelectDoneRef.current === targetId) return
    if (loading) return

    const action = resolveDeepLinkSelection(columns, targetId)
    if (action.type === "wait") return
    if (action.type === "load-deferred") {
      if (deferredKickedRef.current === targetId) return
      deferredKickedRef.current = targetId
      action.stageIds.forEach((stageId) => void loadDeferredColumn(stageId))
      return
    }

    autoSelectDoneRef.current = targetId
    if (action.type === "select") {
      void handleSelectCard(action.card)
    } else if (action.type === "load-error") {
      toast.error("Impossibile caricare l'assunzione, riprova")
    } else {
      toast.error("Nessuna assunzione per questo rapporto")
    }
  }, [initialSelectedRapportoId, loading, columns, handleSelectCard, loadDeferredColumn])

  const drag = React.useMemo<AssunzioniBoardDragHandlers>(
    () => ({
      draggingProcessId,
      dropTargetColumnId,
      onDragStartCard: setDraggingProcessId,
      onDragEndCard: () => {
        window.setTimeout(() => {
          setDraggingProcessId(null)
          setDropTargetColumnId(null)
        }, 0)
      },
      onDragEnterColumn: setDropTargetColumnId,
      onDragOverColumn: setDropTargetColumnId,
      onDragLeaveColumn: (columnId) => {
        setDropTargetColumnId((current) => (current === columnId ? null : current))
      },
      onDropToColumn: (columnId, processId) => {
        setDropTargetColumnId(null)
        setDraggingProcessId(null)
        if (!processId) return
        void moveCard(processId, columnId)
      },
    }),
    [draggingProcessId, dropTargetColumnId, moveCard],
  )

  const sheetProps = React.useMemo(
    () => ({
      key: selectedCardId ?? "__empty__",
      card: selectedCard,
      open: Boolean(selectedCardId),
      onCardChange: (nextCard: AssunzioniBoardCardData) => {
        setSelectedCard(nextCard)
        updateCard(nextCard.id, () => nextCard)
      },
      onOpenChange: (open: boolean) => {
        if (!open) {
          selectedCardRequestRef.current = null
          setSelectedCardId(null)
          setSelectedCard(null)
        }
      },
      onDeleteRapporto: deleteRapporto,
    }),
    [deleteRapporto, selectedCard, selectedCardId, updateCard],
  )

  return {
    loading,
    error,
    filteredColumns,
    totalProcesses,
    searchValue,
    setSearchValue,
    drag,
    selectCard: handleSelectCard,
    loadDeferredColumn,
    sheetProps,
  }
}
