import * as React from "react"

import { fetchContributiInpsByIds } from "../queries/fetch-contributi-inps-by-ids"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti/queries"
import type { ContributoInpsBoardCardData } from "../types"

type UseContributiInpsSelectionResult = {
  selectedCardId: string | null
  selectedCard: ContributoInpsBoardCardData | null
  openCard: (cardId: string) => void
  closeCard: () => void
  patchSelectedCard: (
    recordId: string,
    patch: Partial<ContributoInpsBoardCardData["record"]>,
  ) => void
}

export function useContributiInpsSelection(
  cards: ContributoInpsBoardCardData[],
): UseContributiInpsSelectionResult {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedCard, setSelectedCard] = React.useState<ContributoInpsBoardCardData | null>(null)

  const selectedCardFromCards = React.useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  )

  React.useEffect(() => {
    if (!selectedCardId) {
      setSelectedCard(null)
      return
    }
    if (!selectedCardFromCards) return

    let isActive = true
    const currentCardId = selectedCardId
    const currentCard = selectedCardFromCards
    setSelectedCard(null)

    async function loadSelectedCard() {
      try {
        const recordResponse = await fetchContributiInpsByIds([currentCardId])

        const freshRecord = recordResponse.rows[0] as ContributoInpsBoardCardData["record"] | undefined
        if (!isActive || !freshRecord) return

        const rapportoId =
          currentCard.rapporto?.id ??
          (typeof freshRecord.rapporto_lavorativo_id === "string" ? freshRecord.rapporto_lavorativo_id : null)

        const rapportoResponse = rapportoId
          ? await fetchRapportiLavorativiByIds([rapportoId])
          : { rows: [], total: 0, columns: [] }

        const freshRapporto =
          (rapportoResponse.rows[0] as ContributoInpsBoardCardData["rapporto"]) ??
          currentCard.rapporto

        if (!isActive) return

        setSelectedCard({
          ...currentCard,
          record: freshRecord,
          rapporto: freshRapporto,
        })
      } catch (error) {
        if (!isActive) return
        console.error("Errore caricando dettaglio contributo", error)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
    // Watching id only on purpose: avoid re-fetching detail on every board refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardFromCards?.id, selectedCardId])

  const openCard = React.useCallback((cardId: string) => {
    setSelectedCard(null)
    setSelectedCardId(cardId)
  }, [])

  const closeCard = React.useCallback(() => {
    setSelectedCardId(null)
    setSelectedCard(null)
  }, [])

  const patchSelectedCard = React.useCallback(
    (recordId: string, patch: Partial<ContributoInpsBoardCardData["record"]>) => {
      setSelectedCard((current) =>
        current?.id === recordId
          ? { ...current, record: { ...current.record, ...patch } }
          : current,
      )
    },
    [],
  )

  return {
    selectedCardId,
    selectedCard,
    openCard,
    closeCard,
    patchSelectedCard,
  }
}
