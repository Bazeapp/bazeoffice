import {
  normalizeTableResponse,
  queryTable,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import type { ChiusuraContrattoRecord } from "./types/chiusura-contratto"
import type {
  AssunzioniBoardRpcResponse,
  AssunzioneDetailRpcResponse,
  ChiusureBoardRpcResponse,
  RapportoAssunzioneNames,
  VariazioniBoardRpcResponse,
} from "./types/gestione-rpc"
import type { VariazioneContrattualeRecord } from "./types/variazione-contrattuale"

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

export async function fetchChiusureContratti(query: TablePageQuery) {
  return queryTable<ChiusuraContrattoRecord>({
    table: "chiusure_contratti",
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

export async function fetchAssunzioniBoard(statoFilter?: string | null) {
  const { data, error } = await supabase.rpc("assunzioni_board", {
    p_stato_filter: statoFilter ?? null,
  })
  if (error) {
    throw new Error(`assunzioni_board failed: ${error.message}`)
  }
  const response = data as AssunzioniBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
  }
}

export async function fetchAssunzioneDetail(rapportoId: string) {
  const { data, error } = await supabase.rpc("assunzione_detail", {
    p_rapporto_id: rapportoId,
  })
  if (error) {
    throw new Error(`assunzione_detail failed: ${error.message}`)
  }
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }
  return data as AssunzioneDetailRpcResponse
}

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

export async function fetchChiusureBoard() {
  const { data, error } = await supabase.rpc("chiusure_board", {})
  if (error) throw new Error(`chiusure_board failed: ${error.message}`)
  const response = data as ChiusureBoardRpcResponse | null
  return {
    cards: Array.isArray(response?.cards) ? response.cards : [],
    rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
  }
}

export async function fetchAssunzioniNamesByRapportoIds(
  rapportoIds: string[],
): Promise<Record<string, RapportoAssunzioneNames>> {
  if (rapportoIds.length === 0) return {}
  const uniqueIds = Array.from(new Set(rapportoIds))
  const { data, error } = await supabase.rpc("assunzioni_names_by_rapporto_ids", {
    p_ids: uniqueIds,
  })
  if (error) throw new Error(`assunzioni_names_by_rapporto_ids failed: ${error.message}`)
  return (data ?? {}) as Record<string, RapportoAssunzioneNames>
}

export async function fetchVariazioniContrattuali(query: TablePageQuery) {
  return queryTable<VariazioneContrattualeRecord>({
    table: "variazioni_contrattuali",
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

export async function fetchChiusureByIds(ids: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("chiusure_by_ids", { p_ids: ids })
  if (error) throw new Error(`chiusure_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

export async function fetchVariazioniByRapporto(rapportoId: string) {
  return rpcRows("variazioni_by_rapporto", { p_rapporto_id: rapportoId })
}

export async function fetchVariazioniByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("variazioni_by_ids", { p_ids: ids })
}

export async function fetchAssunzioniByIds(ids: string[], columns?: string) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const builder = supabase.rpc("assunzioni_by_ids", { p_ids: ids })
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`assunzioni_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

export async function fetchAssunzioniByFormType(formType: string, columns?: string) {
  const builder = supabase.rpc("assunzioni_by_form_type", { p_type: formType })
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`assunzioni_by_form_type failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}
