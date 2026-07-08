import { invokeEdgeFunction } from "@/lib/supabase-edge"
import {
  normalizeTableResponse,
  type TableColumnMeta,
  type TableGroupResult,
  type TableQueryResponse,
} from "@/lib/table-query"
import { registerReadCacheInvalidator } from "@/lib/write-tracking"
import type { LookupValueRecord } from "@/types"

const LOOKUP_VALUES_CACHE_TTL_MS = 5 * 60 * 1000

type TableResponse<TRecord> = {
  rows: TRecord[]
  total: number
  columns: TableColumnMeta[]
  groups: TableGroupResult[]
}

let lookupValuesCache:
  | {
      expiresAt: number
      promise: Promise<TableResponse<LookupValueRecord>>
    }
  | null = null

registerReadCacheInvalidator(() => {
  lookupValuesCache = null
})

export async function fetchLookupValues() {
  const now = Date.now()
  if (lookupValuesCache && lookupValuesCache.expiresAt > now) {
    return lookupValuesCache.promise
  }

  const promise = invokeEdgeFunction<TableQueryResponse<LookupValueRecord>>(
    "lookup-values",
    { is_active: true }
  ).then(normalizeTableResponse)

  lookupValuesCache = {
    expiresAt: now + LOOKUP_VALUES_CACHE_TTL_MS,
    promise,
  }

  try {
    return await promise
  } catch (error) {
    lookupValuesCache = null
    throw error
  }
}
