import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchPagamentiByTicketIds(ticketIds: string[]) {
  if (ticketIds.length === 0) return EMPTY_TABLE_ROWS
  return rpcRows("pagamenti_by_ticket_ids", { p_ticket_ids: ticketIds })
}
