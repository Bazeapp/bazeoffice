import { rpcRows } from "@/lib/rpc-rows"

export async function fetchVariazioniByRapporto(rapportoId: string) {
  return rpcRows("variazioni_by_rapporto", { p_rapporto_id: rapportoId })
}
