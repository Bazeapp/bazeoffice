import { supabase } from "@/lib/supabase-client"
import { type TableRow } from "@/lib/rpc-rows"

export async function fetchLavoratoriSelezioniCorrelate(workerIds: string[]) {
  if (workerIds.length === 0) return [] as TableRow[]
  const { data, error } = await supabase.rpc("lavoratori_selezioni_correlate", {
    p_worker_ids: workerIds,
  })
  if (error) throw new Error(`lavoratori_selezioni_correlate failed: ${error.message}`)
  return (Array.isArray(data) ? data : []) as TableRow[]
}
