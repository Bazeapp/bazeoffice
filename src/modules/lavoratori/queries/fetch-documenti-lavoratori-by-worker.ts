import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import type { DocumentoLavoratoreRecord } from "../types/documento-lavoratore"

export async function fetchDocumentiLavoratoriByWorker(lavoratoreId: string) {
  const { data, error } = await supabase.rpc("documenti_lavoratori_by_lavoratore", {
    p_lavoratore_id: lavoratoreId,
  })
  if (error) throw new Error(`documenti_lavoratori_by_lavoratore failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<DocumentoLavoratoreRecord>)
}
