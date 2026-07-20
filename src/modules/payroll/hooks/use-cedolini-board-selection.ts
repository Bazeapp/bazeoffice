import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import { fetchCedolinoDetail } from "../queries/fetch-cedolino-detail"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"

type UseCedoliniBoardSelectionInput = {
  columns: PayrollBoardColumnData[]
  enrichCardFromDetail: (
    cardId: string,
    detail: Partial<
      Pick<
        PayrollBoardCardData,
        | "record"
        | "rapporto"
        | "famiglia"
        | "mese"
        | "presenze"
        | "presenzeRegolari"
        | "richiestaAttivazione"
      >
    >,
  ) => void
  detailRefreshTick: number
}

export function useCedoliniBoardSelection({
  columns,
  enrichCardFromDetail,
  detailRefreshTick,
}: UseCedoliniBoardSelectionInput) {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)

  const selectedCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ??
      null,
    [columns, selectedCardId],
  )

  // Detail loader: fetch enriched fields and inject them into the BOARD
  // cache via enrichCardFromDetail (same shape as CRM pipeline Pattern A).
  // The detail panel binds to `selectedCard` (board cache), so optimistic
  // patches from onPatchCard / onPatchPresence flow directly to the UI
  // without a separate React state to race against.
  React.useEffect(() => {
    if (!selectedCardId) return
    const currentCardId = selectedCardId

    async function loadSelectedCard() {
      try {
        const detail = await fetchCedolinoDetail(currentCardId)
        if (!detail?.record) return

        const enrichedRapporto = await enrichRapportoWithRicercaId(
          detail.rapporto as PayrollBoardCardData["rapporto"],
        )

        enrichCardFromDetail(currentCardId, {
          record: detail.record as PayrollBoardCardData["record"],
          rapporto: enrichedRapporto,
          famiglia: detail.famiglia as PayrollBoardCardData["famiglia"],
          mese: detail.mese as PayrollBoardCardData["mese"],
          presenze: detail.presenze as PayrollBoardCardData["presenze"],
          presenzeRegolari:
            detail.presenzeRegolari as PayrollBoardCardData["presenzeRegolari"],
          richiestaAttivazione:
            detail.richiestaAttivazione as PayrollBoardCardData["richiestaAttivazione"],
        })
      } catch (error) {
        console.error("Errore caricando dettaglio cedolino", error)
      }
    }

    void loadSelectedCard()
  }, [selectedCardId, enrichCardFromDetail, detailRefreshTick])

  const openCard = React.useCallback((cardId: string) => {
    setSelectedCardId(cardId)
  }, [])

  const closeCard = React.useCallback(() => {
    setSelectedCardId(null)
  }, [])

  return {
    selectedCardId,
    selectedCard,
    openCard,
    closeCard,
  }
}
