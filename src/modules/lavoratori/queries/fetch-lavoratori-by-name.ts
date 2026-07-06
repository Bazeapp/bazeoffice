import { rpcRows } from "@/lib/rpc-rows"

export async function fetchLavoratoriByName(
  first: string | null,
  rest: string | null,
  full: string | null,
) {
  return rpcRows("lavoratori_by_name", {
    p_first: first,
    p_rest: rest,
    p_full: full,
  })
}
