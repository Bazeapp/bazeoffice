import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchLavoratoriSearch(query: string, limit = 25) {
  if (!query.trim()) return EMPTY_TABLE_ROWS
  return rpcRows("lavoratori_search", { p_query: query, p_limit: limit })
}
