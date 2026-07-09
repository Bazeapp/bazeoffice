import { rpcRows } from "@/lib/rpc-rows"

export async function fetchContributiInpsByPeriod(start: string, end: string) {
  return rpcRows("contributi_inps_by_period", { p_start: start, p_end: end })
}
