export type BoardColumn<TCard> = { id: string; cards: TCard[] }

export function updateCardInColumns<
  TColumn extends BoardColumn<TCard>,
  TCard extends { id: string },
>(
  columns: TColumn[],
  recordId: string,
  updater: (card: TCard) => TCard,
): TColumn[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => (card.id === recordId ? updater(card) : card)),
  }))
}

export function updateCardAndRehome<
  TColumn extends BoardColumn<TCard>,
  TCard extends { id: string; stage: string },
>(
  columns: TColumn[],
  recordId: string,
  updater: (card: TCard) => TCard,
): TColumn[] {
  let nextCard: TCard | null = null

  const without = columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => {
      if (card.id !== recordId) return true
      nextCard = updater(card)
      return false
    }),
  }))

  if (!nextCard) return columns

  return without.map((column) =>
    column.id === nextCard?.stage ? { ...column, cards: [nextCard, ...column.cards] } : column,
  )
}

export function applyOptimisticCardMove<
  TColumn extends BoardColumn<TCard>,
  TCard extends { id: string; stage: string },
>(
  columns: TColumn[],
  recordId: string,
  targetStageId: string,
  patchCard?: (card: TCard, targetStageId: string) => TCard,
): TColumn[] | undefined {
  let movedCard: TCard | null = null

  const removed = columns.map((column) => {
    if (!column.cards.some((card) => card.id === recordId)) return column
    const remainingCards = column.cards.filter((card) => {
      if (card.id !== recordId) return true
      movedCard = patchCard
        ? patchCard(card, targetStageId)
        : ({ ...card, stage: targetStageId } as TCard)
      return false
    })
    return { ...column, cards: remainingCards }
  })

  if (!movedCard) return undefined

  return removed.map((column) =>
    column.id === targetStageId
      ? { ...column, cards: [movedCard as TCard, ...column.cards] }
      : column,
  )
}
