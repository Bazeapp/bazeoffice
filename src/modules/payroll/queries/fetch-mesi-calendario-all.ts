import { rpcRows } from "@/lib/rpc-rows"

export async function fetchMesiCalendarioAll(limit = 500) {
  return rpcRows("mesi_calendario_all", { p_limit: limit })
}
