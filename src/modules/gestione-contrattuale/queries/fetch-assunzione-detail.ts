import { supabase } from "@/lib/supabase-client"
import type { AssunzioneDetailRpcResponse } from "../types/gestione-rpc"

export async function fetchAssunzioneDetail(rapportoId: string) {
  const { data, error } = await supabase.rpc("assunzione_detail", {
    p_rapporto_id: rapportoId,
  })
  if (error) {
    throw new Error(`assunzione_detail failed: ${error.message}`)
  }
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }
  return data as AssunzioneDetailRpcResponse
}
