export type BoardColumn<TCard> = { id: string; cards: TCard[] }

export function findCardInColumns<TCard extends { id: string }>(
  columns: BoardColumn<TCard>[],
  cardId: string,
): TCard | undefined {
  for (const column of columns) {
    const card = column.cards.find((entry) => entry.id === cardId)
    if (card) return card
  }
  return undefined
}

/**
 * Lazy getter for Pattern-A board refetches: read the latest cached card at
 * mapping time so concurrent setQueryData (detail loader) is preserved.
 */
export function createBoardCardGetter<TCard extends { id: string }>(
  getColumns: () => BoardColumn<TCard>[] | undefined,
): (cardId: string) => TCard | undefined {
  return (cardId) => {
    const columns = getColumns()
    if (!columns) return undefined
    return findCardInColumns(columns, cardId)
  }
}

export function mergeCardDetailInColumns<
  TColumn extends BoardColumn<TCard>,
  TCard extends { id: string },
>(
  columns: TColumn[],
  cardId: string,
  detail: Partial<TCard>,
): { columns: TColumn[]; mergedCard: TCard | undefined } {
  let mergedCard: TCard | undefined

  const nextColumns = columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => {
      if (card.id !== cardId) return card
      mergedCard = { ...card, ...detail }
      return mergedCard
    }),
  }))

  return { columns: nextColumns, mergedCard }
}

export function updateCardInList<TCard extends { id: string }>(
  cards: TCard[],
  recordId: string,
  updater: (card: TCard) => TCard,
): TCard[] {
  return cards.map((card) => (card.id === recordId ? updater(card) : card))
}

export function updateMatchingCardInColumns<
  TCard,
  TColumn extends BoardColumn<TCard>,
>(
  columns: TColumn[],
  matcher: (card: TCard) => boolean,
  updater: (card: TCard) => TCard,
): TColumn[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => (matcher(card) ? updater(card) : card)),
  }))
}

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
