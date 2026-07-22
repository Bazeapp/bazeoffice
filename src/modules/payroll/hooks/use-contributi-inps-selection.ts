import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti/queries"

import { mapContributoRecordToCard } from "../lib/contributi-inps-board"
import { fetchContributiInpsByIds } from "../queries/fetch-contributi-inps-by-ids"
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

    let isActive = true
    const currentCardId = selectedCardId
    const boardCard = selectedCardFromCards

    // Prefer the board card when present; clear the previous selection when
    // opening an off-board deep link so we don't flash stale detail.
    setSelectedCard(boardCard)

    async function loadSelectedCard() {
      try {
        const recordResponse = await fetchContributiInpsByIds([currentCardId])

        const freshRecord = recordResponse.rows[0] as
          | ContributoInpsBoardCardData["record"]
          | undefined
        if (!isActive) return
        if (!freshRecord) {
          if (!boardCard) setSelectedCard(null)
          return
        }

        const rapportoId =
          boardCard?.rapporto?.id ??
          (typeof freshRecord.rapporto_lavorativo_id === "string"
            ? freshRecord.rapporto_lavorativo_id
            : null)

        const rapportoResponse = rapportoId
          ? await fetchRapportiLavorativiByIds([rapportoId])
          : { rows: [], total: 0, columns: [] }

        const freshRapporto =
          (rapportoResponse.rows[0] as ContributoInpsBoardCardData["rapporto"]) ??
          boardCard?.rapporto ??
          null

        const enrichedRapporto = await enrichRapportoWithRicercaId(freshRapporto)

        if (!isActive) return

        if (boardCard) {
          setSelectedCard({
            ...boardCard,
            record: freshRecord,
            rapporto: enrichedRapporto,
          })
          return
        }

        // Deep link outside the selected quarter: build a card from the single
        // record fetch so the sheet can open without waiting for board filters.
        setSelectedCard(
          mapContributoRecordToCard(freshRecord, {
            stage: freshRecord.stato_contributi_inps?.trim() || "Da richiedere",
            rapporto: enrichedRapporto,
            resolvedQuarter: null,
            assunzioneNames: null,
          }),
        )
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
          ? {
              ...current,
              stage:
                typeof patch.stato_contributi_inps === "string"
                  ? patch.stato_contributi_inps
                  : current.stage,
              record: { ...current.record, ...patch },
            }
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
