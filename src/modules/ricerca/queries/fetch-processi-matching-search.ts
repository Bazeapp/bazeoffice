import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchProcessiMatchingSearch(query: string, limit = 12) {
  if (!query.trim()) return EMPTY_TABLE_ROWS
  return rpcRows("processi_matching_search", { p_query: query, p_limit: limit })
}
