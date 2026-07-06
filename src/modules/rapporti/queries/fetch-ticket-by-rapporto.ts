import { rpcRows } from "@/lib/rpc-rows"

export async function fetchTicketByRapporto(rapportoId: string) {
  return rpcRows("ticket_by_rapporto", { p_rapporto_id: rapportoId })
}
