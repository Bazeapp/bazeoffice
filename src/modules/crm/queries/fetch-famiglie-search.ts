import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchFamiglieSearch(query: string, limit = 10) {
  if (!query.trim()) return EMPTY_TABLE_ROWS
  return rpcRows("famiglie_search", { p_query: query, p_limit: limit })
}
