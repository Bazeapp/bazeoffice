import { supabase } from "@/lib/supabase-client"
import type { RapportiLavorativiBoardRpcResponse } from "../types/rapporti-rpc"

export async function fetchRapportiLavorativiBoard(query: {
  limit: number
  offset: number
  search?: string
  statusFilter?: string
}) {
  const { data, error } = await supabase.rpc("rapporti_lavorativi_board", {
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search ?? null,
    p_status_filter: query.statusFilter && query.statusFilter !== "all"
      ? query.statusFilter
      : null,
  })
  if (error) {
    throw new Error(`rapporti_lavorativi_board failed: ${error.message}`)
  }
  const response = data as RapportiLavorativiBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    total: typeof response?.total === "number" ? response.total : 0,
  }
}
