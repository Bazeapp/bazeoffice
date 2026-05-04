import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { supabase } from "@/lib/supabase-client"
import type { LookupValueRecord } from "@/types"
import type { ChiusuraContrattoRecord } from "@/types/entities/chiusura-contratto"
import type { ContributoInpsRecord } from "@/types/entities/contributo-inps"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { MeseCalendarioRecord } from "@/types/entities/mese-calendario"
import type { MeseLavoratoRecord } from "@/types/entities/mese-lavorato"
import type { PagamentoRecord } from "@/types/entities/pagamento"
import type { PresenzaMensileRecord } from "@/types/entities/presenza-mensile"
import type { ProcessoMatchingRecord } from "@/types/entities/processi-matching"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"
import type { RapportoLavorativoRecord } from "@/types/entities/rapporto-lavorativo"
import type { TicketRecord } from "@/types/entities/ticket"
import type { TransazioneFinanziariaRecord } from "@/types/entities/transazione-finanziaria"
import type { VariazioneContrattualeRecord } from "@/types/entities/variazione-contrattuale"

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

type TableName =
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
  | "ticket"
  | "transazioni_finanziarie"
  | "variazioni_contrattuali"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "lookup_values"

type UpdateTableName =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "contributi_inps"
  | "lavoratori"
  | "indirizzi"
  | "mesi_lavorati"
  | "presenze_mensili"
  | "rapporti_lavorativi"
  | "ticket"
  | "variazioni_contrattuali"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"

type CreateTableName =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "lavoratori"
  | "indirizzi"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "ticket"
  | "variazioni_contrattuali"

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

type TableQueryRequest = {
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

export type Gate1RpcFilter = {
  field: string
  operator: QueryFilterOperator
  value?: string
  valueTo?: string
}

type TablePageQuery = {
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

type TableQueryResponse<TRecord> =
  | {
      data?: TRecord[]
      rows?: TRecord[]
      total?: number
      count?: number
      columns?: TableColumnMeta[]
      groups?: TableGroupResult[]
    }
  | TRecord[]

function normalizeTableResponse<TRecord>(
  response: TableQueryResponse<TRecord>
): { rows: TRecord[]; total: number; columns: TableColumnMeta[]; groups: TableGroupResult[] } {
  if (Array.isArray(response)) {
    return { rows: response, total: response.length, columns: [], groups: [] }
  }

  const rows = response.data ?? response.rows ?? []
  const total = response.total ?? response.count ?? rows.length
  return { rows, total, columns: response.columns ?? [], groups: response.groups ?? [] }
}

const TABLE_QUERY_CACHE_TTL_MS = 10_000
const GATE_QUERY_CACHE_TTL_MS = 10_000
const LOOKUP_VALUES_CACHE_TTL_MS = 5 * 60 * 1000

type TableResponse<TRecord> = {
  rows: TRecord[]
  total: number
  columns: TableColumnMeta[]
  groups: TableGroupResult[]
}

const tableQueryCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<TableResponse<TableRow>>
  }
>()
const gateQueryCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<TableResponse<TableRow>>
  }
>()

let lookupValuesCache:
  | {
      expiresAt: number
      promise: Promise<TableResponse<LookupValueRecord>>
    }
  | null = null

function makeTableQueryCacheKey(payload: TableQueryRequest) {
  return JSON.stringify(payload)
}

function clearTableQueryCache() {
  tableQueryCache.clear()
}

async function queryTable<TRecord>(payload: TableQueryRequest) {
  const cacheKey = makeTableQueryCacheKey(payload)
  const now = Date.now()
  const cached = tableQueryCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return (await cached.promise) as TableResponse<TRecord>
  }

  const promise = invokeEdgeFunction<TableQueryResponse<TRecord>>("table-query", payload).then(
    normalizeTableResponse
  )

  tableQueryCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise: promise as Promise<TableResponse<TableRow>>,
  })

  try {
    return await promise
  } catch (error) {
    tableQueryCache.delete(cacheKey)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`table-query(${payload.table}) failed: ${message}`)
  }
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

export async function fetchContributiInps(query: TablePageQuery) {
  return queryTable<ContributoInpsRecord>({
    table: "contributi_inps",
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

export async function fetchIndirizzi(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "indirizzi",
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

export async function fetchMesiCalendario(query: TablePageQuery) {
  return queryTable<MeseCalendarioRecord>({
    table: "mesi_calendario",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "data_inizio", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchMesiLavorati(query: TablePageQuery) {
  return queryTable<MeseLavoratoRecord>({
    table: "mesi_lavorati",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "creato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchPagamenti(query: TablePageQuery) {
  return queryTable<PagamentoRecord>({
    table: "pagamenti",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "creato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchPresenzeMensili(query: TablePageQuery) {
  return queryTable<PresenzaMensileRecord>({
    table: "presenze_mensili",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "creato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
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

export async function fetchTickets(query: TablePageQuery) {
  return queryTable<TicketRecord>({
    table: "ticket",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "data_apertura", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}

export async function fetchTransazioniFinanziarie(query: TablePageQuery) {
  return queryTable<TransazioneFinanziariaRecord>({
    table: "transazioni_finanziarie",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "creato_il", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
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

export async function fetchEsperienzeLavoratoriByWorker(lavoratoreId: string) {
  return queryTable<EsperienzaLavoratoreRecord>({
    table: "esperienze_lavoratori",
    select: ["*"],
    orderBy: [
      { field: "stato_esperienza_attiva", ascending: false },
      { field: "data_inizio", ascending: false },
      { field: "aggiornato_il", ascending: false },
    ],
    filters: {
      kind: "group",
      id: "esperienze-lavoratore-root",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "esperienze-lavoratore-id",
          field: "lavoratore_id",
          operator: "is",
          value: lavoratoreId,
        },
      ],
    },
  })
}

export async function fetchDocumentiLavoratoriByWorker(lavoratoreId: string) {
  return queryTable<DocumentoLavoratoreRecord>({
    table: "documenti_lavoratori",
    select: ["*"],
    orderBy: [{ field: "aggiornato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "documenti-lavoratore-root",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "documenti-lavoratore-id",
          field: "lavoratore_id",
          operator: "is",
          value: lavoratoreId,
        },
      ],
    },
  })
}

export async function fetchReferenzeLavoratoriByWorker(lavoratoreId: string) {
  return queryTable<ReferenzaLavoratoreRecord>({
    table: "referenze_lavoratori",
    select: ["*"],
    orderBy: [
      { field: "referenza_verificata", ascending: true },
      { field: "data_inzio", ascending: false },
      { field: "aggiornato_il", ascending: false },
    ],
    filters: {
      kind: "group",
      id: "referenze-lavoratore-root",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "referenze-lavoratore-id",
          field: "lavoratore_id",
          operator: "is",
          value: lavoratoreId,
        },
      ],
    },
  })
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

export async function fetchGate1Lavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[]
}) {
  return fetchGateLavoratoriRpc("gate1_lavoratori", query)
}

export async function fetchGate2Lavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[]
}) {
  return fetchGateLavoratoriRpc("gate2_lavoratori", query)
}

export async function fetchCercaLavoratori(query: {
  limit: number
  offset: number
  search?: string
  filters?: Gate1RpcFilter[]
}) {
  return fetchGateLavoratoriRpc("cerca_lavoratori", query)
}

async function fetchGateLavoratoriRpc(
  functionName: "gate1_lavoratori" | "gate2_lavoratori" | "cerca_lavoratori",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[]
  }
) {
  const cacheKey = JSON.stringify({ functionName, ...query })
  const now = Date.now()
  const cached = gateQueryCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc(functionName, {
      p_limit: query.limit,
      p_offset: query.offset,
      p_search: query.search ?? null,
      p_filters: query.filters ?? [],
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`${functionName} failed: ${error.message}`)
    }

    return normalizeTableResponse(data as TableQueryResponse<TableRow>)
  })

  gateQueryCache.set(cacheKey, {
    expiresAt: now + GATE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    gateQueryCache.delete(cacheKey)
    throw error
  }
}

export async function fetchLookupValues() {
  const now = Date.now()
  if (lookupValuesCache && lookupValuesCache.expiresAt > now) {
    return lookupValuesCache.promise
  }

  const promise = invokeEdgeFunction<TableQueryResponse<LookupValueRecord>>(
    "lookup-values",
    { is_active: true }
  ).then(normalizeTableResponse)

  lookupValuesCache = {
    expiresAt: now + LOOKUP_VALUES_CACHE_TTL_MS,
    promise,
  }

  try {
    return await promise
  } catch (error) {
    lookupValuesCache = null
    throw error
  }
}

export async function fetchAssunzioni(query: TablePageQuery) {
  return queryTable<TableRow>({
    table: "assunzioni",
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

type UpdateProcessoStatoSalesResponse = {
  id: string
  stato_sales: string
}

type UpdateRecordResponse = {
  table: UpdateTableName
  id: string
  row: TableRow
}

type CreateRecordResponse = {
  table: CreateTableName
  row: TableRow
}

type DeleteRecordResponse = {
  table: UpdateTableName
  id: string
  deleted: boolean
}

export type AutomationWebhookId =
  | "finance-request-invoice-data"
  | "finance-invoice-payment"
  | "workflow-smart-matching"
  | "workflow-create-job-offer-seo"
  | "workflow-create-rapporto-after-match"

type RunAutomationWebhookResponse = {
  ok: boolean
  automationId: AutomationWebhookId
  recordId: string
  responseBody?: string
}

export async function updateRecord(
  table: UpdateTableName,
  id: string,
  patch: Record<string, unknown>
) {
  const response = await invokeEdgeFunction<UpdateRecordResponse>("update-record", {
    table,
    id,
    patch,
  })
  clearTableQueryCache()
  return response
}

export async function createRecord(
  table: CreateTableName,
  values: Record<string, unknown>
) {
  const response = await invokeEdgeFunction<CreateRecordResponse>("create-record", {
    table,
    values,
  })
  clearTableQueryCache()
  return response
}

export async function deleteRecord(table: UpdateTableName, id: string) {
  const response = await invokeEdgeFunction<DeleteRecordResponse>("delete-record", {
    table,
    id,
  })
  clearTableQueryCache()
  return response
}

export async function runAutomationWebhook(
  automationId: AutomationWebhookId,
  recordId: string,
  context?: Record<string, unknown>
) {
  const response = await invokeEdgeFunction<RunAutomationWebhookResponse>("run-automation-webhook", {
    automationId,
    recordId,
    context,
  })
  clearTableQueryCache()
  return response
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
