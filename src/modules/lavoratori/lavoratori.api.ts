import {
  normalizeTableResponse,
  queryTable,
  type Gate1RpcFilter,
  type QueryFilterGroup,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import type { DocumentoLavoratoreRecord } from "./types/documento-lavoratore"
import type { LavoratoreRecord } from "./types/lavoratore"
import type { LavoratoreSchedaResult } from "./types/lavoratori-rpc"

type TableRow = Record<string, unknown>

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

async function fetchGateLavoratoriRpc(
  functionName: "gate1_lavoratori" | "gate2_lavoratori" | "cerca_lavoratori",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
  },
) {
  const { data, error } = await supabase.rpc(functionName, {
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search ?? null,
    p_filters: query.filters ?? [],
    p_order_by: query.orderBy?.field ?? null,
    p_order_dir: query.orderBy ? (query.orderBy.ascending ? "asc" : "desc") : null,
  })
  if (error) {
    throw new Error(`${functionName} failed: ${error.message}`)
  }
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

export async function fetchLavoratori(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "lavoratori",
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

export async function fetchDocumentiLavoratoriByWorker(lavoratoreId: string) {
  const { data, error } = await supabase.rpc("documenti_lavoratori_by_lavoratore", {
    p_lavoratore_id: lavoratoreId,
  })
  if (error) throw new Error(`documenti_lavoratori_by_lavoratore failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<DocumentoLavoratoreRecord>)
}

export async function fetchLavoratoriByIds(ids: string[], roles?: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("lavoratori_by_ids", {
    p_ids: ids,
    p_roles: roles && roles.length > 0 ? roles : null,
  })
  if (error) throw new Error(`lavoratori_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<LavoratoreRecord>)
}

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
  const asArray = (value: unknown) => (Array.isArray(value) ? (value as TableRow[]) : [])
  return {
    worker: (payload.worker as TableRow | null) ?? null,
    indirizzi: asArray(payload.indirizzi),
    documenti: asArray(payload.documenti),
    esperienze: asArray(payload.esperienze),
    referenze: asArray(payload.referenze),
    relatedSearches: asArray(payload.related_searches),
  }
}

export async function fetchLavoratoriByName(
  first: string | null,
  rest: string | null,
  full: string | null,
) {
  return rpcRows("lavoratori_by_name", {
    p_first: first,
    p_rest: rest,
    p_full: full,
  })
}

export async function fetchGate1Lavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[] | QueryFilterGroup
  orderBy?: { field: string; ascending: boolean }
}) {
  return fetchGateLavoratoriRpc("gate1_lavoratori", query)
}

export async function fetchGate2Lavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[] | QueryFilterGroup
  orderBy?: { field: string; ascending: boolean }
}) {
  return fetchGateLavoratoriRpc("gate2_lavoratori", query)
}

export async function fetchCercaLavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[] | QueryFilterGroup
  orderBy?: { field: string; ascending: boolean }
}) {
  return fetchGateLavoratoriRpc("cerca_lavoratori", query)
}

export async function fetchLavoratoriBoard(
  gate: "cerca" | "gate1" | "gate2",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
    includeRelated?: boolean
  },
): Promise<{
  rows: TableRow[]
  total: number
  indirizzi: TableRow[]
  selezioniCorrelate: TableRow[]
}> {
  const { data, error } = await supabase.rpc("lavoratori_board", {
    p_gate: gate,
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search ?? null,
    p_filters: query.filters ?? [],
    p_order_by: query.orderBy?.field ?? null,
    p_order_dir: query.orderBy ? (query.orderBy.ascending ? "asc" : "desc") : null,
    p_include_related: query.includeRelated ?? true,
  })
  if (error) throw new Error(`lavoratori_board(${gate}) failed: ${error.message}`)
  const payload = (data ?? {}) as Record<string, unknown>
  const arr = (value: unknown) => (Array.isArray(value) ? (value as TableRow[]) : [])
  return {
    rows: arr(payload.rows),
    total: typeof payload.total === "number" ? payload.total : arr(payload.rows).length,
    indirizzi: arr(payload.indirizzi),
    selezioniCorrelate: arr(payload.selezioni_correlate),
  }
}
