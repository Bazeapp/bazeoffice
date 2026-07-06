import { invokeEdgeFunction } from "@/lib/supabase-edge"

type TableRow = Record<string, unknown>

export type TableFilterFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "multi_enum"
  | "id"

export type TableColumnMeta = {
  name: string
  dataType: string
  udtName: string | null
  filterType: TableFilterFieldType
}

export type TableGroupResult = {
  field: string
  value: string
  label: string
  count: number
}

export type TableName =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "contributi_inps"
  | "indirizzi"
  | "lavoratori"
  | "mesi_calendario"
  | "mesi_lavorati"
  | "pagamenti"
  | "presenze_mensili"
  | "rapporti_lavorativi"
  | "richieste_attivazione"
  | "ticket"
  | "transazioni_finanziarie"
  | "variazioni_contrattuali"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "lookup_values"

type QuerySort = {
  field: string
  ascending?: boolean
}

export type QueryFilterOperator =
  | "is"
  | "in"
  | "is_not"
  | "has"
  | "not_has"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_true"
  | "is_false"
  | "has_any"
  | "has_all"
  | "not_has_any"
  | "is_empty"
  | "is_not_empty"

export type QueryFilterCondition = {
  kind: "condition"
  id: string
  field: string
  operator: QueryFilterOperator
  value: string
  valueTo?: string
}

export type QueryFilterGroup = {
  kind: "group"
  id: string
  logic: "and" | "or"
  nodes: QueryFilterNode[]
}

export type QueryFilterNode = QueryFilterCondition | QueryFilterGroup

export type TableQueryRequest = {
  table: TableName
  select: string[]
  limit?: number
  offset?: number
  orderBy?: QuerySort[]
  includeSchema?: boolean
  search?: string
  searchFields?: string[]
  filters?: QueryFilterGroup
  groupBy?: string[]
}

export type TablePageQuery = {
  limit: number
  offset: number
  select?: string[]
  orderBy?: QuerySort[]
  includeSchema?: boolean
  search?: string
  searchFields?: string[]
  filters?: QueryFilterGroup
  groupBy?: string[]
}

export type TableQueryResponse<TRecord> =
  | {
      data?: TRecord[]
      rows?: TRecord[]
      total?: number
      count?: number
      columns?: TableColumnMeta[]
      groups?: TableGroupResult[]
    }
  | TRecord[]

export type Gate1RpcFilter = {
  field: string
  operator: QueryFilterOperator
  value?: string
  valueTo?: string
}

type TableResponse<TRecord> = {
  rows: TRecord[]
  total: number
  columns: TableColumnMeta[]
  groups: TableGroupResult[]
}

export function normalizeTableResponse<TRecord>(
  response: TableQueryResponse<TRecord>
): { rows: TRecord[]; total: number; columns: TableColumnMeta[]; groups: TableGroupResult[] } {
  if (Array.isArray(response)) {
    return { rows: response, total: response.length, columns: [], groups: [] }
  }

  const rows = response.data ?? response.rows ?? []
  const total = response.total ?? response.count ?? rows.length
  return { rows, total, columns: response.columns ?? [], groups: response.groups ?? [] }
}

export async function queryTable<TRecord>(payload: TableQueryRequest) {
  try {
    const response = await invokeEdgeFunction<TableQueryResponse<TRecord>>("table-query", payload)
    return normalizeTableResponse(response) as TableResponse<TRecord>
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`table-query(${payload.table}) failed: ${message}`)
  }
}

export type { TableRow, TableResponse }

export const EMPTY_TABLE_ROWS: TableResponse<TableRow> = {
  rows: [],
  total: 0,
  columns: [],
  groups: [],
}
