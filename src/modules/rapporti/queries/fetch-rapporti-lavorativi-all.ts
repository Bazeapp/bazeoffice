import { rpcRows } from "@/lib/rpc-rows"

export async function fetchRapportiLavorativiAll(limit = 3000, columns?: string) {
  return rpcRows("rapporti_lavorativi_all", { p_limit: limit }, columns)
}
