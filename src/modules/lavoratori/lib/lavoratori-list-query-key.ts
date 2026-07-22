import { WORKER_LIST_DATA_VERSION } from "./list-constants"
import type { QueryFilterGroup } from "@/lib/table-query"

export type DebouncedQuery = {
  searchValue: string
  filters: QueryFilterGroup | undefined
  sorting: { id: string; desc: boolean }[]
}

export type LavoratoriListQueryKeyInput = {
  applyGate1BaseFilters: boolean
  debouncedQuery: DebouncedQuery
  forcedWorkerStatus: string | string[] | undefined
  gate1FollowupFilter: string
  gate1ProvinciaFilter: string
  includeRelatedSelectionDetails: boolean
  pageIndex: number
  pageSize: number
}

/**
 * Stable serialized key for the lavoratori list fetch. Equal content → equal
 * key, even when `debouncedQuery` is a new object reference (prevents the
 * refetch loop when parent re-renders with identical search/filters).
 */
export function buildLavoratoriListQueryKey(input: LavoratoriListQueryKeyInput): string {
  return JSON.stringify({
    applyGate1BaseFilters: input.applyGate1BaseFilters,
    filters: input.debouncedQuery.filters ?? null,
    forcedWorkerStatus: input.forcedWorkerStatus,
    gate1FollowupFilter: input.gate1FollowupFilter,
    gate1ProvinciaFilter: input.gate1ProvinciaFilter,
    includeRelatedSelectionDetails: input.includeRelatedSelectionDetails,
    listDataVersion: WORKER_LIST_DATA_VERSION,
    offset: input.pageIndex * input.pageSize,
    pageSize: input.pageSize,
    search: input.debouncedQuery.searchValue.trim(),
    sorting: input.debouncedQuery.sorting,
  })
}

/**
 * Skip a non-silent list fetch when the key matches the last successful load.
 * Silent reloads (`reloadSilently`) clear the last key before bumping the
 * realtime tick, so they always proceed.
 */
export function shouldSkipLavoratoriListFetch(
  lastLoadedQueryKey: string | null,
  nextQueryKey: string,
  silent: boolean,
): boolean {
  return !silent && lastLoadedQueryKey === nextQueryKey
}
