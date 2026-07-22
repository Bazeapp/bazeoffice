export type BoardColumn<TCard> = { id: string; cards: TCard[] }

export type PreserveMissingFieldBinding<T extends Record<string, unknown>> =
  | readonly [string, keyof T]
  | (keyof T & string)

/**
 * Pattern A realtime helper: for each binding, if the source column is NOT
 * present in `freshRow`, restore `previous`'s value onto `target`. Mutates
 * `target` in place. When `freshRow` is missing entirely, every bound field
 * falls back to `previous`.
 *
 * Bindings may be `[sourceColumn, targetField]` pairs (CRM / rapporti) or
 * plain keys when source and target share the same name (chiusure / variazioni).
 */
export function preserveMissingFields<T extends Record<string, unknown>>(
  target: T,
  previous: T | undefined | null,
  freshRow: Record<string, unknown> | undefined | null,
  bindings: ReadonlyArray<PreserveMissingFieldBinding<T>>,
): void {
  if (!previous) return
  for (const binding of bindings) {
    const [column, field] = Array.isArray(binding)
      ? binding
      : ([binding, binding] as const)
    if (freshRow && column in freshRow) continue
    ;(target as Record<string, unknown>)[field as string] = previous[field]
  }
}

/**
 * Non-mutating variant for nested detail objects (e.g. assunzioni sub-rows).
 * Returns `previous` when `fresh` is null (sub-object omitted from the board
 * row); returns `fresh` unchanged when `previous` is null. Columns absent
 * from BOTH `fresh` and `previous` are left absent (no own-`undefined` keys).
 */
export function mergePreservedMissingFields<T extends Record<string, unknown>>(
  fresh: T | null,
  previous: T | null,
  columns: ReadonlyArray<keyof T & string>,
): T | null {
  if (!previous) return fresh
  if (!fresh) return previous
  const merged = { ...fresh }
  const columnsInPrevious = columns.filter((column) => column in previous)
  preserveMissingFields(merged, previous, fresh, columnsInPrevious)
  return merged
}

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
