import { invokeEdgeFunction } from "@/lib/supabase-edge"
import type { LookupValueRecord } from "@/types"

type TableRow = Record<string, unknown>

type TableName =
  | "famiglie"
  | "lavoratori"
  | "processi_matching"
  | "lookup_values"

type UpdateTableName = "famiglie" | "lavoratori" | "processi_matching"

type QuerySort = {
  field: string
  ascending?: boolean
}

type TableQueryRequest = {
  table: TableName
  select: string[]
  limit?: number
  offset?: number
  orderBy?: QuerySort[]
}

type TablePageQuery = {
  limit: number
  offset: number
  orderBy?: QuerySort[]
}

type TableQueryResponse<TRecord> =
  | {
      data?: TRecord[]
      rows?: TRecord[]
      total?: number
      count?: number
    }
  | TRecord[]

function normalizeTableResponse<TRecord>(
  response: TableQueryResponse<TRecord>
): { rows: TRecord[]; total: number } {
  if (Array.isArray(response)) {
    return { rows: response, total: response.length }
  }

  const rows = response.data ?? response.rows ?? []
  const total = response.total ?? response.count ?? rows.length
  return { rows, total }
}

async function queryTable<TRecord>(payload: TableQueryRequest) {
  const response = await invokeEdgeFunction<TableQueryResponse<TRecord>>(
    "table-query",
    payload
  )
  return normalizeTableResponse(response)
}

export async function fetchFamiglie(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "famiglie",
    select: ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "aggiornato_il", ascending: false }],
  })
}

export async function fetchLavoratori(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "lavoratori",
    select: ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "aggiornato_il", ascending: false }],
  })
}

export async function fetchProcessiMatching(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "processi_matching",
    select: ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "aggiornato_il", ascending: false }],
  })
}

export async function fetchLookupValues() {
  const response = await invokeEdgeFunction<TableQueryResponse<LookupValueRecord>>(
    "lookup-values",
    { is_active: true }
  )
  return normalizeTableResponse(response)
}

type UpdateProcessoStatoSalesResponse = {
  id: string
  stato_sales: string
}

type UpdateRecordResponse = {
  table: UpdateTableName
  id: string
  row: TableRow
}

export async function updateRecord(
  table: UpdateTableName,
  id: string,
  patch: Record<string, unknown>
) {
  return invokeEdgeFunction<UpdateRecordResponse>("update-record", {
    table,
    id,
    patch,
  })
}

export async function updateProcessoMatchingStatoSales(
  processId: string,
  statoSales: string
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
