import { supabase } from "@/lib/supabase-client"
import { asTableRowArray, type TableRow } from "@/lib/rpc-rows"
import type { LavoratoreSchedaResult } from "../types/lavoratori-rpc"

export async function fetchLavoratoreScheda(workerId: string): Promise<LavoratoreSchedaResult> {
  const empty: LavoratoreSchedaResult = {
    worker: null,
    indirizzi: [],
    documenti: [],
    esperienze: [],
    referenze: [],
    relatedSearches: [],
  }
  if (!workerId) return empty
  const { data, error } = await supabase.rpc("lavoratore_scheda", { p_id: workerId })
  if (error) throw new Error(`lavoratore_scheda failed: ${error.message}`)
  const payload = (data ?? {}) as Record<string, unknown>
  return {
    worker: (payload.worker as TableRow | null) ?? null,
    indirizzi: asTableRowArray(payload.indirizzi),
    documenti: asTableRowArray(payload.documenti),
    esperienze: asTableRowArray(payload.esperienze),
    referenze: asTableRowArray(payload.referenze),
    relatedSearches: asTableRowArray(payload.related_searches),
  }
}
