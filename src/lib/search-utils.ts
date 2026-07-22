/**
 * Trim and collapse whitespace for server-side search RPCs; undefined when empty.
 *
 * Board RPCs tokenize the query and require every word to appear in the search
 * text (AND). Pass the full phrase so multi-word names work, not just a single
 * token.
 */
export function buildServerSearchQuery(value: string) {
  const normalizedValue = value.trim().replace(/\s+/g, " ")
  return normalizedValue || undefined
}

export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getSearchTokens(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean)
}

export function matchesSearchQuery(fields: unknown[], query: string) {
  const tokens = getSearchTokens(query)
  if (tokens.length === 0) return true

  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "))
  return tokens.every((token) => haystack.includes(token))
}

type KanbanGroupLike = {
  cards: unknown[]
  deferred?: boolean
  loaded?: boolean
  isLoaded?: boolean
}

export function hideEmptyKanbanGroups<TGroup extends KanbanGroupLike>(groups: TGroup[]) {
  return groups.filter((group) => {
    if (group.cards.length > 0) return true
    if (group.deferred && group.loaded === false) return true
    if (group.deferred && group.isLoaded === false) return true
    return false
  })
}
