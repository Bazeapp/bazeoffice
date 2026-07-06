import { supabase } from "@/lib/supabase-client"
import type { RiattivazioniBoardRpcResponse } from "../types/support-rpc"

export async function fetchRiattivazioniBoard() {
  const { data, error } = await supabase.rpc("riattivazioni_board", {})
  if (error) throw new Error(`riattivazioni_board failed: ${error.message}`)
  const response = (data ?? {}) as RiattivazioniBoardRpcResponse
  return {
    cards: Array.isArray(response.cards) ? response.cards : [],
  }
}
