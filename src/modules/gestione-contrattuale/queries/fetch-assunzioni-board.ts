import { supabase } from "@/lib/supabase-client"
import type { AssunzioniBoardRpcResponse } from "../types/gestione-rpc"

export async function fetchAssunzioniBoard(statoFilter?: string | null) {
  const { data, error } = await supabase.rpc("assunzioni_board", {
    p_stato_filter: statoFilter ?? null,
  })
  if (error) {
    throw new Error(`assunzioni_board failed: ${error.message}`)
  }
  const response = data as AssunzioniBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
  }
}
