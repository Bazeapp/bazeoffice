import { supabase } from "@/lib/supabase-client"
import type { ChiusureBoardRpcResponse } from "../types/gestione-rpc"

export async function fetchChiusureBoard() {
  const { data, error } = await supabase.rpc("chiusure_board", {})
  if (error) throw new Error(`chiusure_board failed: ${error.message}`)
  const response = data as ChiusureBoardRpcResponse | null
  return {
    cards: Array.isArray(response?.cards) ? response.cards : [],
    rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
  }
}
