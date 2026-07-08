import { supabase } from "@/lib/supabase-client"
import type { RicercaBoardRpcResponse } from "../types/ricerca-rpc"

export async function fetchRicercaBoard(eagerStages: string[], deferredStages: string[]) {
  const { data, error } = await supabase.rpc("ricerca_board", {
    p_eager_stages: eagerStages,
    p_deferred_stages: deferredStages,
  })
  if (error) throw new Error(`ricerca_board failed: ${error.message}`)
  const response = data as RicercaBoardRpcResponse | null
  return {
    processes: Array.isArray(response?.processes) ? response.processes : [],
    deferredCounts: (response?.deferredCounts ?? {}) as Record<string, number>,
  }
}
