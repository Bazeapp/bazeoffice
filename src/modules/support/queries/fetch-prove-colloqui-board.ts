import { supabase } from "@/lib/supabase-client"
import type { ProveColloquiBoardRpcResponse } from "../types/support-rpc"

export async function fetchProveColloquiBoard(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("prove_colloqui_board", {
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw new Error(`prove_colloqui_board failed: ${error.message}`)
  const response = (data ?? {}) as ProveColloquiBoardRpcResponse
  return {
    rapporti: Array.isArray(response.rapporti) ? response.rapporti : [],
    selezioni: Array.isArray(response.selezioni) ? response.selezioni : [],
  }
}
