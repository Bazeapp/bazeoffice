import {
  normalizeTableResponse,
  queryTable,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import type { RapportoLavorativoRecord } from "./types/rapporto-lavorativo"
import type { RapportiLavorativiBoardRpcResponse } from "./types/rapporti-rpc"

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

export async function fetchRapportiLavorativi(query: TablePageQuery) {
  return queryTable<RapportoLavorativoRecord>({
    table: "rapporti_lavorativi",
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

export async function fetchRapportiLavorativiBoard(query: {
  limit: number
  offset: number
  search?: string
  statusFilter?: string
}) {
  const { data, error } = await supabase.rpc("rapporti_lavorativi_board", {
    p_limit: query.limit,
    p_offset: query.offset,
    p_search: query.search ?? null,
    p_status_filter: query.statusFilter && query.statusFilter !== "all"
      ? query.statusFilter
      : null,
  })
  if (error) {
    throw new Error(`rapporti_lavorativi_board failed: ${error.message}`)
  }
  const response = data as RapportiLavorativiBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    total: typeof response?.total === "number" ? response.total : 0,
  }
}

export async function fetchRapportiLavorativiByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("rapporti_lavorativi_by_ids", { p_ids: ids })
}

export async function fetchRapportiLavorativiAll(limit = 3000, columns?: string) {
  return rpcRows("rapporti_lavorativi_all", { p_limit: limit }, columns)
}
