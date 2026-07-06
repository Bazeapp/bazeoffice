import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchPresenzeByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_TABLE_ROWS
  return rpcRows("presenze_by_ids", { p_ids: ids })
}
