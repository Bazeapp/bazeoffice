import { supabase } from "@/lib/supabase-client"
import type { VariazioniBoardRpcResponse } from "../types/gestione-rpc"

export async function fetchVariazioniBoard() {
  const { data, error } = await supabase.rpc("variazioni_board", {})
  if (error) {
    throw new Error(`variazioni_board failed: ${error.message}`)
  }
  const response = data as VariazioniBoardRpcResponse | null
  return {
    cards: Array.isArray(response?.cards) ? response.cards : [],
    rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
  }
}
