import * as React from "react"

import type { AssegnazioneCardData } from "../types"

/**
 * Keeps the open assegnazione sheet bound to live board data (Pattern B).
 * Board invalidate usually replaces the snapshot via find(); detailRefreshTick
 * forces re-bind when realtime asks reloadOpenDetail.
 */
export function useAssegnazioneOpenDetailSync({
  cards,
  selectedCard,
  setSelectedCard,
  isSheetOpen,
  detailRefreshTick,
  setOpenProcessId,
}: {
  cards: AssegnazioneCardData[]
  selectedCard: AssegnazioneCardData | null
  setSelectedCard: React.Dispatch<
    React.SetStateAction<AssegnazioneCardData | null>
  >
  isSheetOpen: boolean
  detailRefreshTick: number
  setOpenProcessId: (processId: string | null) => void
}): AssegnazioneCardData | null {
  const selectedCardFromState = React.useMemo(() => {
    void detailRefreshTick
    if (!selectedCard?.id) return selectedCard
    return cards.find((card) => card.id === selectedCard.id) ?? selectedCard
  }, [cards, selectedCard, detailRefreshTick])

  React.useEffect(() => {
    setOpenProcessId(isSheetOpen ? (selectedCardFromState?.id ?? null) : null)
  }, [isSheetOpen, selectedCardFromState?.id, setOpenProcessId])

  React.useEffect(() => {
    if (!selectedCard?.id || detailRefreshTick === 0) return
    const fresh = cards.find((card) => card.id === selectedCard.id)
    if (fresh) setSelectedCard(fresh)
  }, [cards, detailRefreshTick, selectedCard?.id, setSelectedCard])

  return selectedCardFromState
}
