import * as React from "react"

import { enrichRapportoWithRicercaId } from "@/modules/rapporti/lib"
import type { MeseLavoratoRecord, PresenzaMensileRecord } from "@/types"

import {
  applyPayrollCardPatch,
  applyPayrollPresencePatch,
  mapCedolinoDetailToCard,
} from "../lib/payroll-board"
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
  ) => PayrollBoardCardData | undefined
  detailRefreshTick: number
}

export function useCedoliniBoardSelection({
  columns,
  enrichCardFromDetail,
  detailRefreshTick,
}: UseCedoliniBoardSelectionInput) {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [offBoardCard, setOffBoardCard] =
    React.useState<PayrollBoardCardData | null>(null)

  const boardCard = React.useMemo(
    () =>
      columns.flatMap((column) => column.cards).find((card) => card.id === selectedCardId) ??
      null,
    [columns, selectedCardId],
  )

  // Prefer the board cache when the card is on the current month; fall back to a
  // detail-fetched card for deep links outside the selected period.
  const selectedCard =
    boardCard ??
    (offBoardCard?.id === selectedCardId ? offBoardCard : null)

  React.useEffect(() => {
    if (!selectedCardId) {
      setOffBoardCard(null)
      return
    }

    const currentCardId = selectedCardId
    const onBoard = boardCard?.id === currentCardId
    let isActive = true

    async function loadSelectedCard() {
      try {
        const detail = await fetchCedolinoDetail(currentCardId)
        if (!isActive) return
        if (!detail?.record) {
          if (!onBoard) setOffBoardCard(null)
          return
        }

        const enrichedRapporto = await enrichRapportoWithRicercaId(
          detail.rapporto as PayrollBoardCardData["rapporto"],
        )
        if (!isActive) return

        const detailFields = {
          record: detail.record as PayrollBoardCardData["record"],
          rapporto: enrichedRapporto,
          famiglia: detail.famiglia as PayrollBoardCardData["famiglia"],
          mese: detail.mese as PayrollBoardCardData["mese"],
          presenze: detail.presenze as PayrollBoardCardData["presenze"],
          presenzeRegolari:
            detail.presenzeRegolari as PayrollBoardCardData["presenzeRegolari"],
          richiestaAttivazione:
            detail.richiestaAttivazione as PayrollBoardCardData["richiestaAttivazione"],
        }

        if (onBoard) {
          enrichCardFromDetail(currentCardId, detailFields)
          setOffBoardCard(null)
          return
        }

        setOffBoardCard(
          mapCedolinoDetailToCard(detail, { rapporto: enrichedRapporto }),
        )
      } catch (error) {
        if (!isActive) return
        console.error("Errore caricando dettaglio cedolino", error)
      }
    }

    void loadSelectedCard()

    return () => {
      isActive = false
    }
  }, [selectedCardId, boardCard?.id, enrichCardFromDetail, detailRefreshTick])

  const openCard = React.useCallback((cardId: string) => {
    setSelectedCardId(cardId)
    setOffBoardCard((current) => (current?.id === cardId ? current : null))
  }, [])

  const closeCard = React.useCallback(() => {
    setSelectedCardId(null)
    setOffBoardCard(null)
  }, [])

  const patchSelectedCard = React.useCallback(
    (recordId: string, patch: Partial<MeseLavoratoRecord>) => {
      setOffBoardCard((current) =>
        current?.id === recordId ? applyPayrollCardPatch(current, patch) : current,
      )
    },
    [],
  )

  const patchSelectedPresence = React.useCallback(
    (presenceId: string, patch: Partial<PresenzaMensileRecord>) => {
      setOffBoardCard((current) =>
        current ? applyPayrollPresencePatch(current, presenceId, patch) : current,
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
    patchSelectedPresence,
  }
}
