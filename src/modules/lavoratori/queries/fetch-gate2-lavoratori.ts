import { normalizeTableResponse, type Gate1RpcFilter, type QueryFilterGroup, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { type TableRow } from "@/lib/rpc-rows"

async function fetchGateLavoratoriRpc(
  functionName: "gate1_lavoratori" | "gate2_lavoratori" | "cerca_lavoratori",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
  },
) {
  const { data, error } = await supabase.rpc(functionName, {
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search ?? null,
    p_filters: query.filters ?? [],
    p_order_by: query.orderBy?.field ?? null,
    p_order_dir: query.orderBy ? (query.orderBy.ascending ? "asc" : "desc") : null,
  })
  if (error) {
    throw new Error(`${functionName} failed: ${error.message}`)
  }
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

export async function fetchGate2Lavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[] | QueryFilterGroup
  orderBy?: { field: string; ascending: boolean }
}) {
  return fetchGateLavoratoriRpc("gate2_lavoratori", query)
}
