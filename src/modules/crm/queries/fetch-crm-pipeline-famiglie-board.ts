import { supabase } from "@/lib/supabase-client"
import type { CrmPipelineBoardRpcResponse } from "../types/crm-rpc"

export async function fetchCrmPipelineFamiglieBoard(query: {
  limit: number
  offset: number
  stageFilter?: string[]
  search?: string
  createdFrom?: string | null
  createdTo?: string | null
  tipoLavoro?: string[]
  preventivoAccettato?: boolean | null
  chiamataPrenotata?: boolean | null
}) {
  const { data, error } = await supabase.rpc("crm_pipeline_famiglie_board", {
    p_limit: query.limit,
    p_offset: query.offset,
    p_stage_filter: query.stageFilter?.length ? query.stageFilter : null,
    p_search: query.search?.trim() ? query.search.trim() : null,
    p_created_from: query.createdFrom ?? null,
    p_created_to: query.createdTo ?? null,
    p_tipo_lavoro_filter: query.tipoLavoro?.length ? query.tipoLavoro : null,
    p_preventivo_accettato: query.preventivoAccettato ?? null,
    p_chiamata_prenotata: query.chiamataPrenotata ?? null,
  })

if (error) {
    throw new Error(`crm_pipeline_famiglie_board failed: ${error.message}`)
  }

const response = data as CrmPipelineBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    stageCounts: Array.isArray(response?.stage_counts) ? response.stage_counts : [],
  }
}
