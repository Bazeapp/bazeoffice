import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchContributiInpsByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_TABLE_ROWS
  return rpcRows("contributi_inps_by_ids", { p_ids: ids })
}
