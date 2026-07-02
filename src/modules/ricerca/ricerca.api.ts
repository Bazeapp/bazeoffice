import {
  normalizeTableResponse,
  queryTable,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import type { ProcessoMatchingRecord } from "./types/processi-matching"
import type {
  RicercaBoardRpcResponse,
  RicercaWorkerRelatedSelectionSummariesRpcResponse,
  RicercaWorkerSchedaResult,
} from "./types/ricerca-rpc"

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

export async function fetchRicercaBoard(eagerStages: string[], deferredStages: string[]) {
  const { data, error } = await supabase.rpc("ricerca_board", {
    p_eager_stages: eagerStages,
    p_deferred_stages: deferredStages,
  })
  if (error) throw new Error(`ricerca_board failed: ${error.message}`)
  const response = data as RicercaBoardRpcResponse | null
  return {
    processes: Array.isArray(response?.processes) ? response.processes : [],
    deferredCounts: (response?.deferredCounts ?? {}) as Record<string, number>,
  }
}

export async function fetchRicercaWorkerRelatedSelectionSummaries(query: {
  workerIds: string[]
  currentProcessId: string
}) {
  const uniqueWorkerIds = Array.from(new Set(query.workerIds.filter(Boolean))).sort()
  if (uniqueWorkerIds.length === 0) return []

  const { data, error } = await supabase.rpc("ricerca_worker_related_selection_summaries", {
    p_worker_ids: uniqueWorkerIds,
    p_current_process_id: query.currentProcessId,
  })
  if (error) {
    throw new Error(
      `ricerca_worker_related_selection_summaries failed: ${error.message}`,
    )
  }
  const response = data as RicercaWorkerRelatedSelectionSummariesRpcResponse | null
  return Array.isArray(response?.rows) ? response.rows : []
}

export async function fetchProcessiMatching(query: TablePageQuery) {
  return queryTable<ProcessoMatchingRecord>({
    table: "processi_matching",
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

export async function fetchProcessiMatchingByIds(options: {
  ids?: string[]
  famigliaIds?: string[]
  columns?: string
}) {
  const ids = options.ids?.length ? options.ids : null
  const famigliaIds = options.famigliaIds?.length ? options.famigliaIds : null
  if (!ids && !famigliaIds) {
    return { rows: [], total: 0, columns: [], groups: [] }
  }
  const builder = supabase.rpc("processi_matching_by_ids", {
    p_ids: ids,
    p_famiglia_ids: famigliaIds,
  })
  const { data, error } = options.columns
    ? await builder.select(options.columns)
    : await builder
  if (error) throw new Error(`processi_matching_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<ProcessoMatchingRecord>)
}

export async function fetchLavoratoriSelezioniCorrelate(workerIds: string[]) {
  if (workerIds.length === 0) return [] as TableRow[]
  const { data, error } = await supabase.rpc("lavoratori_selezioni_correlate", {
    p_worker_ids: workerIds,
  })
  if (error) throw new Error(`lavoratori_selezioni_correlate failed: ${error.message}`)
  return (Array.isArray(data) ? data : []) as TableRow[]
}

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
  const arr = (value: unknown) => (Array.isArray(value) ? (value as TableRow[]) : [])
  return {
    worker: (payload.worker as TableRow | null) ?? null,
    indirizzi: arr(payload.indirizzi),
    esperienze: arr(payload.esperienze),
    documenti: arr(payload.documenti),
    referenze: arr(payload.referenze),
    selezione: (payload.selezione as TableRow | null) ?? null,
  }
}

export async function fetchIndirizziInBbox(options: {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  entitaTabella?: string
  limit?: number
  offset?: number
}) {
  const { data, error } = await supabase.rpc("indirizzi_in_bbox", {
    p_min_lat: options.minLat,
    p_max_lat: options.maxLat,
    p_min_lng: options.minLng,
    p_max_lng: options.maxLng,
    p_entita_tabella: options.entitaTabella ?? "lavoratori",
    p_limit: options.limit ?? 1000,
    p_offset: options.offset ?? 0,
  })
  if (error) throw new Error(`indirizzi_in_bbox failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

export async function fetchProcessiMatchingSearch(query: string, limit = 12) {
  if (!query.trim()) return EMPTY_ROWS
  return rpcRows("processi_matching_search", { p_query: query, p_limit: limit })
}

export async function fetchLavoratoriSearch(query: string, limit = 25) {
  if (!query.trim()) return EMPTY_ROWS
  return rpcRows("lavoratori_search", { p_query: query, p_limit: limit })
}

export async function fetchSelezioniLookup(options: {
  ids?: string[]
  lavoratoreIds?: string[]
  processoIds?: string[]
  stati?: string[]
  columns?: string
}) {
  const p_ids = options.ids?.length ? options.ids : null
  const p_lavoratore_ids = options.lavoratoreIds?.length ? options.lavoratoreIds : null
  const p_processo_ids = options.processoIds?.length ? options.processoIds : null
  const p_stati = options.stati?.length ? options.stati : null
  if (!p_ids && !p_lavoratore_ids && !p_processo_ids && !p_stati) return EMPTY_ROWS
  return rpcRows(
    "selezioni_lookup",
    { p_ids, p_lavoratore_ids, p_processo_ids, p_stati },
    options.columns,
  )
}

export async function fetchSelezioniLavoratori(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "selezioni_lavoratori",
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
