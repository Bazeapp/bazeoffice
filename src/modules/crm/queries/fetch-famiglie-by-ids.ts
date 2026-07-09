import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import type { FamigliaRecord } from "../types/famiglie"

export async function fetchFamiglieByIds(ids: string[], columns?: string) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const builder = supabase.rpc("famiglie_by_ids", { p_ids: ids })
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`famiglie_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<FamigliaRecord>)
}
