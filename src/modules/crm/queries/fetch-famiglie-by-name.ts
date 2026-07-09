import { rpcRows } from "@/lib/rpc-rows"

export async function fetchFamiglieByName(first: string, rest: string) {
  return rpcRows("famiglie_by_name", { p_first: first, p_rest: rest })
}
