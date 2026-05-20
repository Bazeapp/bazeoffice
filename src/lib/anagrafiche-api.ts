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
import type { RichiestaAttivazioneRecord } from "@/types/entities/richiesta-attivazione"
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
  | "richieste_attivazione"
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

export type CrmPipelineBoardRpcRow = {
  process: TableRow
  family: TableRow | null
  address: TableRow | null
  richiesta_attivazione?: TableRow | null
}

export type CrmPipelineBoardRpcResponse = {
  rows?: CrmPipelineBoardRpcRow[]
  stage_counts?: Array<{ value: string; count: number }>
}

export type RapportiLavorativiBoardRpcResponse = {
  rows?: RapportoLavorativoRecord[]
  total?: number
}

export type RicercaWorkerRelatedSelectionSummary = {
  worker_id: string
  count: number
  dots: Array<{
    process_id: string
    stato_selezione: string
  }>
}

export type RicercaWorkerRelatedSelectionSummariesRpcResponse = {
  rows?: RicercaWorkerRelatedSelectionSummary[]
}

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
const crmPipelineBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{
      rows: CrmPipelineBoardRpcRow[]
      stageCounts: Array<{ value: string; count: number }>
    }>
  }
>()
const crmPipelineDetailCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<CrmPipelineBoardRpcRow | null>
  }
>()
const rapportiLavorativiBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ rows: RapportoLavorativoRecord[]; total: number }>
  }
>()
const ricercaWorkerRelatedSelectionSummariesCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<RicercaWorkerRelatedSelectionSummary[]>
  }
>()

let lookupValuesCache:
  | {
      expiresAt: number
      promise: Promise<TableResponse<LookupValueRecord>>
    }
  | null = null

let pendingWriteCount = 0
let pendingWriteUnloadGuardInstalled = false

function installPendingWriteUnloadGuard() {
  if (pendingWriteUnloadGuardInstalled || typeof window === "undefined") return
  pendingWriteUnloadGuardInstalled = true

  window.addEventListener("beforeunload", (event) => {
    if (pendingWriteCount <= 0) return
    event.preventDefault()
    event.returnValue = ""
  })
}

async function trackWrite<TResponse>(operation: Promise<TResponse>) {
  installPendingWriteUnloadGuard()
  pendingWriteCount += 1

  try {
    return await operation
  } finally {
    pendingWriteCount = Math.max(0, pendingWriteCount - 1)
  }
}

function makeTableQueryCacheKey(payload: TableQueryRequest) {
  return JSON.stringify(payload)
}

function clearReadCaches() {
  tableQueryCache.clear()
  gateQueryCache.clear()
  crmPipelineBoardCache.clear()
  crmPipelineDetailCache.clear()
  rapportiLavorativiBoardCache.clear()
  ricercaWorkerRelatedSelectionSummariesCache.clear()
  lookupValuesCache = null
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

export async function fetchRapportiLavorativiBoard(query: {
  limit: number
  offset: number
  search?: string
  statusFilter?: string
}) {
  const cacheKey = JSON.stringify({ functionName: "rapporti_lavorativi_board", ...query })
  const now = Date.now()
  const cached = rapportiLavorativiBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("rapporti_lavorativi_board", {
      p_limit: query.limit,
      p_offset: query.offset,
      p_search: query.search ?? null,
      p_status_filter: query.statusFilter && query.statusFilter !== "all"
        ? query.statusFilter
        : null,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`rapporti_lavorativi_board failed: ${error.message}`)
    }

    const response = data as RapportiLavorativiBoardRpcResponse | null
    return {
      rows: Array.isArray(response?.rows) ? response.rows : [],
      total: typeof response?.total === "number" ? response.total : 0,
    }
  })

  rapportiLavorativiBoardCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    rapportiLavorativiBoardCache.delete(cacheKey)
    throw error
  }
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

export async function fetchRicercaWorkerRelatedSelectionSummaries(query: {
  workerIds: string[]
  currentProcessId: string
}) {
  const uniqueWorkerIds = Array.from(new Set(query.workerIds.filter(Boolean))).sort()
  if (uniqueWorkerIds.length === 0) return []

  const cacheKey = JSON.stringify({
    functionName: "ricerca_worker_related_selection_summaries",
    currentProcessId: query.currentProcessId,
    workerIds: uniqueWorkerIds,
  })
  const now = Date.now()
  const cached = ricercaWorkerRelatedSelectionSummariesCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("ricerca_worker_related_selection_summaries", {
      p_worker_ids: uniqueWorkerIds,
      p_current_process_id: query.currentProcessId,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(
        `ricerca_worker_related_selection_summaries failed: ${error.message}`
      )
    }

    const response =
      data as RicercaWorkerRelatedSelectionSummariesRpcResponse | null
    return Array.isArray(response?.rows) ? response.rows : []
  })

  ricercaWorkerRelatedSelectionSummariesCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    ricercaWorkerRelatedSelectionSummariesCache.delete(cacheKey)
    throw error
  }
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
  const cacheKey = JSON.stringify({ functionName: "crm_pipeline_famiglie_board", ...query })
  const now = Date.now()
  const cached = crmPipelineBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("crm_pipeline_famiglie_board", {
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
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`crm_pipeline_famiglie_board failed: ${error.message}`)
    }

    const response = data as CrmPipelineBoardRpcResponse | null
    return {
      rows: Array.isArray(response?.rows) ? response.rows : [],
      stageCounts: Array.isArray(response?.stage_counts) ? response.stage_counts : [],
    }
  })

  crmPipelineBoardCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    crmPipelineBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchCrmPipelineFamigliaDetail(processId: string) {
  const cacheKey = JSON.stringify({ functionName: "crm_pipeline_famiglia_detail", processId })
  const now = Date.now()
  const cached = crmPipelineDetailCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("crm_pipeline_famiglia_detail", {
      p_process_id: processId,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`crm_pipeline_famiglia_detail failed: ${error.message}`)
    }

    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return null
    }

    return data as CrmPipelineBoardRpcRow
  })

  crmPipelineDetailCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    crmPipelineDetailCache.delete(cacheKey)
    throw error
  }
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
  | "workflow-create-whatsapp-text"
  | "workflow-create-rapporto-after-match"

type RunAutomationWebhookResponse = {
  ok: boolean
  automationId: AutomationWebhookId
  recordId: string
  responseBody?: string
}

export type SmartMatchingForwardWorker = {
  lavoratore_id: string
  email?: string | null
  availability_score?: number | null
  experience_score?: number | null
  referenze_score?: number | null
  travel_time_score?: number | null
  general_score?: number | null
  travel_time_minutes?: number | null
  distance_km?: number | null
}

export type SmartMatchingForwardResponse = {
  mode: "forward"
  phase?: string
  dry_run: boolean
  mock_distance?: boolean
  straight_line_radius_km?: number | null
  processo_matching_id: string
  selected_count?: number
  distance_elements_used?: number
  funnel?: Record<string, number>
  selected_workers?: SmartMatchingForwardWorker[]
  sync_result?: unknown[]
  ai_profiler_result?: unknown
  logs?: unknown[]
}

export async function updateRecord(
  table: UpdateTableName,
  id: string,
  patch: Record<string, unknown>
) {
  const response = await trackWrite(
    invokeEdgeFunction<UpdateRecordResponse>("update-record", {
      table,
      id,
      patch,
    })
  )
  clearReadCaches()
  return response
}

export async function createRecord(
  table: CreateTableName,
  values: Record<string, unknown>
) {
  const response = await trackWrite(
    invokeEdgeFunction<CreateRecordResponse>("create-record", {
      table,
      values,
    })
  )
  clearReadCaches()
  return response
}

export async function deleteRecord(table: UpdateTableName, id: string) {
  const response = await trackWrite(
    invokeEdgeFunction<DeleteRecordResponse>("delete-record", {
      table,
      id,
    })
  )
  clearReadCaches()
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
  clearReadCaches()
  return response
}

export async function runSmartMatchingForwardPreview(processId: string) {
  return invokeEdgeFunction<SmartMatchingForwardResponse>("smartmatching-v21", {
    processo_matching_id: processId,
    dry_run: false,
    max_results: 20,
    max_distance_elements: 300,
    max_straight_line_km: 30,
    call_ai_profiler: false,
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
