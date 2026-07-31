export const RICERCA_BOARD_RECRUITER_FILTER_STORAGE_KEY =
  "bazeoffice.ricercaBoard.recruiterFilter.v1"

export const RICERCA_BOARD_RECRUITER_FILTER_ALL = "all"
export const RICERCA_BOARD_RECRUITER_FILTER_UNASSIGNED = "unassigned"

export function isSpecialRecruiterFilter(value: string): boolean {
  return (
    value === RICERCA_BOARD_RECRUITER_FILTER_ALL ||
    value === RICERCA_BOARD_RECRUITER_FILTER_UNASSIGNED
  )
}

export function sanitizeRecruiterFilter(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function readStoredRecruiterFilter(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sanitizeRecruiterFilter(
      window.localStorage.getItem(RICERCA_BOARD_RECRUITER_FILTER_STORAGE_KEY),
    )
  } catch {
    return null
  }
}

export function writeStoredRecruiterFilter(value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RICERCA_BOARD_RECRUITER_FILTER_STORAGE_KEY, value)
  } catch {
    // localStorage may be unavailable in private or embedded contexts.
  }
}

export type ResolveRecruiterFilterParams = {
  stored: string | null
  currentOperatorId: string | null
  selectableOperatorIds: ReadonlySet<string> | readonly string[]
}

/**
 * Chooses the recruiter dropdown value:
 * 1. persisted preference when still valid ("all", "unassigned", or a selectable id)
 * 2. otherwise the logged-in recruiter when they appear in the options
 * 3. otherwise "all"
 */
export function resolveRecruiterFilter({
  stored,
  currentOperatorId,
  selectableOperatorIds,
}: ResolveRecruiterFilterParams): string {
  const selectable =
    selectableOperatorIds instanceof Set
      ? selectableOperatorIds
      : new Set(selectableOperatorIds)

  if (stored !== null) {
    if (isSpecialRecruiterFilter(stored) || selectable.has(stored)) {
      return stored
    }
  }

  if (currentOperatorId && selectable.has(currentOperatorId)) {
    return currentOperatorId
  }

  return RICERCA_BOARD_RECRUITER_FILTER_ALL
}
