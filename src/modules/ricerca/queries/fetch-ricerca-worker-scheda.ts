import { supabase } from "@/lib/supabase-client"
import { asTableRowArray, type TableRow } from "@/lib/rpc-rows"
import type { RicercaWorkerSchedaResult } from "../types/ricerca-rpc"

export async function fetchRicercaWorkerScheda(
  workerId: string,
  selectionId?: string | null,
): Promise<RicercaWorkerSchedaResult> {
  const empty: RicercaWorkerSchedaResult = {
    worker: null,
    indirizzi: [],
    esperienze: [],
    documenti: [],
    referenze: [],
    selezione: null,
  }
  if (!workerId) return empty
  const { data, error } = await supabase.rpc("ricerca_worker_scheda", {
    p_worker_id: workerId,
    p_selection_id: selectionId ?? null,
  })
  if (error) throw new Error(`ricerca_worker_scheda failed: ${error.message}`)
  const payload = (data ?? {}) as Record<string, unknown>
  return {
    worker: (payload.worker as TableRow | null) ?? null,
    indirizzi: asTableRowArray(payload.indirizzi),
    esperienze: asTableRowArray(payload.esperienze),
    documenti: asTableRowArray(payload.documenti),
    referenze: asTableRowArray(payload.referenze),
    selezione: (payload.selezione as TableRow | null) ?? null,
  }
}
