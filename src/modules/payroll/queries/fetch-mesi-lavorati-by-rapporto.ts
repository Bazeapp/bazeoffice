import { rpcRows } from "@/lib/rpc-rows"

export async function fetchMesiLavoratiByRapporto(rapportoId: string) {
  return rpcRows("mesi_lavorati_by_rapporto", { p_rapporto_id: rapportoId })
}
