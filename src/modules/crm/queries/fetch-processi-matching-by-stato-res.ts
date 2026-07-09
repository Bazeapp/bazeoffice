import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchProcessiMatchingByStatoRes(stati: string[]) {
  if (stati.length === 0) return EMPTY_TABLE_ROWS
  return rpcRows("processi_matching_by_stato_res", { p_stati: stati })
}
