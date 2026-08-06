export const CRM_PIPELINE_SALES_FILTER_STORAGE_KEY =
  "bazeoffice.crmPipelineFamiglie.salesFilter.v1"

export const CRM_PIPELINE_SALES_FILTER_ALL = "all"
export const CRM_PIPELINE_SALES_FILTER_UNASSIGNED = "unassigned"

export function isSpecialSalesFilter(value: string): boolean {
  return (
    value === CRM_PIPELINE_SALES_FILTER_ALL ||
    value === CRM_PIPELINE_SALES_FILTER_UNASSIGNED
  )
}

export function sanitizeSalesFilter(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function readStoredSalesFilter(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sanitizeSalesFilter(
      window.localStorage.getItem(CRM_PIPELINE_SALES_FILTER_STORAGE_KEY),
    )
  } catch {
    return null
  }
}

export function writeStoredSalesFilter(value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CRM_PIPELINE_SALES_FILTER_STORAGE_KEY, value)
  } catch {
    // localStorage may be unavailable in private or embedded contexts.
  }
}

export type ResolveSalesFilterParams = {
  stored: string | null
  currentOperatorId: string | null
  selectableOperatorIds: ReadonlySet<string> | readonly string[]
}

/**
 * Chooses the sales dropdown value:
 * 1. persisted preference when still valid ("all", "unassigned", or a selectable id)
 * 2. otherwise the logged-in sales operator when they appear in the options
 * 3. otherwise "all"
 */
export function resolveSalesFilter({
  stored,
  currentOperatorId,
  selectableOperatorIds,
}: ResolveSalesFilterParams): string {
  const selectable =
    selectableOperatorIds instanceof Set
      ? selectableOperatorIds
      : new Set(selectableOperatorIds)

  if (stored !== null) {
    if (isSpecialSalesFilter(stored) || selectable.has(stored)) {
      return stored
    }
  }

  if (currentOperatorId && selectable.has(currentOperatorId)) {
    return currentOperatorId
  }

  return CRM_PIPELINE_SALES_FILTER_ALL
}

export type SalesServerFilterParams = {
  salesOperatorId: string | null
  salesUnassigned: boolean | null
}

export function salesFilterToServerParams(
  selectedSalesFilter: string,
): SalesServerFilterParams {
  if (selectedSalesFilter === CRM_PIPELINE_SALES_FILTER_UNASSIGNED) {
    return { salesOperatorId: null, salesUnassigned: true }
  }
  if (
    selectedSalesFilter === CRM_PIPELINE_SALES_FILTER_ALL ||
    selectedSalesFilter.trim().length === 0
  ) {
    return { salesOperatorId: null, salesUnassigned: null }
  }
  return { salesOperatorId: selectedSalesFilter, salesUnassigned: null }
}
