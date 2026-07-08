import { rpcRows } from "@/lib/rpc-rows"

export async function fetchContributiInpsByRapporto(rapportoId: string) {
  return rpcRows("contributi_inps_by_rapporto", { p_rapporto_id: rapportoId })
}
