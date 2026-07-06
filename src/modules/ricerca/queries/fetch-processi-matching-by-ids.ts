import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import type { ProcessoMatchingRecord } from "../types/processi-matching"

export async function fetchProcessiMatchingByIds(options: {
  ids?: string[]
  famigliaIds?: string[]
  columns?: string
}) {
  const ids = options.ids?.length ? options.ids : null
  const famigliaIds = options.famigliaIds?.length ? options.famigliaIds : null
  if (!ids && !famigliaIds) {
    return { rows: [], total: 0, columns: [], groups: [] }
  }
  const builder = supabase.rpc("processi_matching_by_ids", {
    p_ids: ids,
    p_famiglia_ids: famigliaIds,
  })
  const { data, error } = options.columns
    ? await builder.select(options.columns)
    : await builder
  if (error) throw new Error(`processi_matching_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<ProcessoMatchingRecord>)
}
