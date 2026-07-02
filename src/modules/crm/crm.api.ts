import { updateRecord } from "@/lib/record-crud"
import {
  normalizeTableResponse,
  queryTable,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import type { FamigliaRecord } from "./types/famiglie"
import type { RichiestaAttivazioneRecord } from "./types/richiesta-attivazione"
import type { CrmPipelineBoardRpcResponse, CrmPipelineBoardRpcRow } from "./types/crm-rpc"

type TableRow = Record<string, unknown>

const EMPTY_ROWS = { rows: [], total: 0, columns: [], groups: [] }

async function rpcRows(
  fn: string,
  params: Record<string, unknown>,
  columns?: string,
) {
  const builder = supabase.rpc(fn, params)
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`${fn} failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

type UpdateProcessoStatoSalesResponse = {
  id: string
  stato_sales: string
}

export async function fetchFamiglie(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "famiglie",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "aggiornato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchRichiesteAttivazione(query: TablePageQuery) {
  return queryTable<RichiestaAttivazioneRecord>({
    table: "richieste_attivazione",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "aggiornato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchFamiglieByIds(ids: string[], columns?: string) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const builder = supabase.rpc("famiglie_by_ids", { p_ids: ids })
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`famiglie_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<FamigliaRecord>)
}

export async function fetchFamiglieSearch(query: string, limit = 10) {
  if (!query.trim()) return EMPTY_ROWS
  return rpcRows("famiglie_search", { p_query: query, p_limit: limit })
}

export async function fetchFamiglieByName(first: string, rest: string) {
  return rpcRows("famiglie_by_name", { p_first: first, p_rest: rest })
}

export async function fetchRichiesteAttivazioneLookup(options: {
  ids?: string[]
  processoResIds?: string[]
}) {
  const p_ids = options.ids?.length ? options.ids : null
  const p_processo_res_ids = options.processoResIds?.length ? options.processoResIds : null
  if (!p_ids && !p_processo_res_ids) return EMPTY_ROWS
  return rpcRows("richieste_attivazione_lookup", { p_ids, p_processo_res_ids })
}

export async function fetchProcessiMatchingByStatoRes(stati: string[]) {
  if (stati.length === 0) return EMPTY_ROWS
  return rpcRows("processi_matching_by_stato_res", { p_stati: stati })
}

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

export async function fetchCrmPipelineFamigliaDetail(processId: string) {
  const { data, error } = await supabase.rpc("crm_pipeline_famiglia_detail", {
    p_process_id: processId,
  })

  if (error) {
    throw new Error(`crm_pipeline_famiglia_detail failed: ${error.message}`)
  }

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }

  return data as CrmPipelineBoardRpcRow
}

export async function updateProcessoMatchingStatoSales(
  processId: string,
  statoSales: string,
) {
  const response = await updateRecord("processi_matching", processId, {
    stato_sales: statoSales,
  })

  return {
    id: processId,
    stato_sales:
      (typeof response.row.stato_sales === "string"
        ? response.row.stato_sales
        : statoSales) as UpdateProcessoStatoSalesResponse["stato_sales"],
  }
}
