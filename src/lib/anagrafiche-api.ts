import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { supabase } from "@/lib/supabase-client"
import type { LookupValueRecord } from "@/types"
import type { ChiusuraContrattoRecord } from "@/types/entities/chiusura-contratto"
import type { ContributoInpsRecord } from "@/types/entities/contributo-inps"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { FamigliaRecord } from "@/types/entities/famiglie"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
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

export type CedoliniBoardRpcRow = {
  record: MeseLavoratoRecord
  mese: MeseCalendarioRecord | null
  rapporto: RapportoLavorativoRecord | null
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  transazione: TransazioneFinanziariaRecord | null
  pagamento: PagamentoRecord | null
}

export type CedoliniBoardRpcResponse = {
  rows?: CedoliniBoardRpcRow[]
  total?: number
}

export type CedolinoDetailRpcResponse = {
  record: MeseLavoratoRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: FamigliaRecord | null
  mese: MeseCalendarioRecord | null
  presenze: PresenzaMensileRecord | null
  presenzeRegolari: PresenzaMensileRecord | null
}

export type AssunzioniBoardRpcRow = {
  rapporto: RapportoLavorativoRecord | null
  process: ProcessoMatchingRecord | null
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzione: Record<string, unknown> | null
  lavoratoreAssunzione: Record<string, unknown> | null
}

export type AssunzioniBoardRpcResponse = {
  rows?: AssunzioniBoardRpcRow[]
}

export type AssunzioneDetailRpcResponse = {
  rapporto: RapportoLavorativoRecord | null
  assunzione: Record<string, unknown> | null
  lavoratoreAssunzione: Record<string, unknown> | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
}

export type VariazioniBoardRpcCard = {
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
  lavoratoreAddress: Record<string, unknown> | null
}

export type VariazioniBoardRpcRapporto = {
  rapporto: RapportoLavorativoRecord
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
}

export type VariazioniBoardRpcResponse = {
  cards?: VariazioniBoardRpcCard[]
  rapporti?: VariazioniBoardRpcRapporto[]
}

export type ChiusureBoardRpcCard = {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: { id: string; nome: string | null; cognome: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null } | null
}

export type ChiusureBoardRpcRapporto = {
  rapporto: RapportoLavorativoRecord
  famiglia: { id: string; nome: string | null; cognome: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null } | null
}

export type ChiusureBoardRpcResponse = {
  cards?: ChiusureBoardRpcCard[]
  rapporti?: ChiusureBoardRpcRapporto[]
}

export type RicercaBoardRpcProcess = {
  id: string
  stato_res: string | null
  famiglia_id: string | null
  recruiter_ricerca_e_selezione_id: string | null
  referente_ricerca_e_selezione_id: string | null
  ore_settimanale: string | number | null
  numero_giorni_settimanali: string | number | null
  deadline_mobile: string | null
  tipo_lavoro: unknown
  tipo_rapporto: unknown
  famiglia: { id: string; nome: string | null; cognome: string | null; email: string | null; telefono: string | null } | null
  indirizzo: Record<string, unknown> | null
}

export type RicercaBoardRpcResponse = {
  processes?: RicercaBoardRpcProcess[]
  deferredCounts?: Record<string, number>
}

export type LavoratoreExtrasRpcResponse = {
  documenti?: DocumentoLavoratoreRecord[]
  esperienze?: EsperienzaLavoratoreRecord[]
  referenze?: ReferenzaLavoratoreRecord[]
}

export type ProveColloquiBoardRpcRapportoEntry = {
  rapporto: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
}

export type ProveColloquiBoardRpcSelezioneEntry = {
  selezione: Record<string, unknown>
  processo: ProcessoMatchingRecord | null
  processoFamiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
}

export type RiattivazioniBoardRpcCard = {
  record: ChiusuraContrattoRecord & { stato_riattivazione_famiglia?: string | null; motivazione_lost?: string | null; data_per_riattivazione?: string | null; sconto_proposto_riattivazione?: unknown }
  rapporto: RapportoLavorativoRecord | null
  famiglia: { id: string; nome: string | null; cognome: string | null; email: string | null } | null
  lavoratore: { id: string; nome: string | null; cognome: string | null; email: string | null } | null
}

export type RiattivazioniBoardRpcResponse = {
  cards?: RiattivazioniBoardRpcCard[]
}

export type ProveColloquiBoardRpcResponse = {
  rapporti?: ProveColloquiBoardRpcRapportoEntry[]
  selezioni?: ProveColloquiBoardRpcSelezioneEntry[]
}

export type SupportTicketsBundleRpcResponse = {
  tickets?: TicketRecord[]
  rapporti?: RapportoLavorativoRecord[]
  chiusure?: ChiusuraContrattoRecord[]
  assunzioni?: Array<Record<string, unknown>>
  contributi?: ContributoInpsRecord[]
  cedolini?: MeseLavoratoRecord[]
  pagamenti?: PagamentoRecord[]
  presenze?: PresenzaMensileRecord[]
  variazioni?: VariazioneContrattualeRecord[]
  famiglie?: Array<{ id: string; nome: string | null; cognome: string | null }>
  lavoratori?: Array<{ id: string; nome: string | null; cognome: string | null }>
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
const cedoliniBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ rows: CedoliniBoardRpcRow[]; total: number }>
  }
>()
const cedolinoDetailCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<CedolinoDetailRpcResponse | null>
  }
>()
const assunzioniBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ rows: AssunzioniBoardRpcRow[] }>
  }
>()
const assunzioneDetailCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<AssunzioneDetailRpcResponse | null>
  }
>()
const variazioniBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ cards: VariazioniBoardRpcCard[]; rapporti: VariazioniBoardRpcRapporto[] }>
  }
>()
const ricercaBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ processes: RicercaBoardRpcProcess[]; deferredCounts: Record<string, number> }>
  }
>()
const chiusureBoardCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<{ cards: ChiusureBoardRpcCard[]; rapporti: ChiusureBoardRpcRapporto[] }>
  }
>()
const supportTicketsBundleCache = new Map<
  string,
  {
    expiresAt: number
    promise: Promise<SupportTicketsBundleRpcResponse>
  }
>()

let lookupValuesCache:
  | {
      expiresAt: number
      promise: Promise<TableResponse<LookupValueRecord>>
    }
  | null = null

export type ProvinciaRecord = {
  sigla: string
  nome: string
  nome_inglese: string | null
}

let provincieCache:
  | {
      expiresAt: number
      promise: Promise<ProvinciaRecord[]>
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

let lastLocalWriteAt = 0

async function trackWrite<TResponse>(operation: Promise<TResponse>) {
  installPendingWriteUnloadGuard()
  pendingWriteCount += 1

  try {
    const result = await operation
    lastLocalWriteAt = Date.now()
    return result
  } finally {
    pendingWriteCount = Math.max(0, pendingWriteCount - 1)
  }
}

export function beginPendingWrite() {
  installPendingWriteUnloadGuard()
  pendingWriteCount += 1
}

export function endPendingWrite() {
  pendingWriteCount = Math.max(0, pendingWriteCount - 1)
  lastLocalWriteAt = Date.now()
}

export function getPendingWriteCount() {
  return pendingWriteCount
}

export function getMillisSinceLastLocalWrite() {
  return lastLocalWriteAt === 0 ? Number.POSITIVE_INFINITY : Date.now() - lastLocalWriteAt
}

function makeTableQueryCacheKey(payload: TableQueryRequest) {
  return JSON.stringify(payload)
}

export function clearReadCaches() {
  tableQueryCache.clear()
  gateQueryCache.clear()
  rapportiLavorativiBoardCache.clear()
  ricercaWorkerRelatedSelectionSummariesCache.clear()
  cedoliniBoardCache.clear()
  cedolinoDetailCache.clear()
  assunzioniBoardCache.clear()
  assunzioneDetailCache.clear()
  variazioniBoardCache.clear()
  supportTicketsBundleCache.clear()
  chiusureBoardCache.clear()
  ricercaBoardCache.clear()
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

export async function fetchCedoliniBoard(yearMonth: string) {
  const cacheKey = JSON.stringify({ functionName: "cedolini_board", yearMonth })
  const now = Date.now()
  const cached = cedoliniBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("cedolini_board", {
      p_year_month: yearMonth,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`cedolini_board failed: ${error.message}`)
    }

    const response = data as CedoliniBoardRpcResponse | null
    return {
      rows: Array.isArray(response?.rows) ? response.rows : [],
      total: typeof response?.total === "number" ? response.total : 0,
    }
  })

  cedoliniBoardCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    cedoliniBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchCedolinoDetail(id: string) {
  const cacheKey = JSON.stringify({ functionName: "cedolino_detail", id })
  const now = Date.now()
  const cached = cedolinoDetailCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("cedolino_detail", {
      p_id: id,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`cedolino_detail failed: ${error.message}`)
    }

    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return null
    }

    return data as CedolinoDetailRpcResponse
  })

  cedolinoDetailCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    cedolinoDetailCache.delete(cacheKey)
    throw error
  }
}

export async function fetchAssunzioniBoard(statoFilter?: string | null) {
  const cacheKey = JSON.stringify({ functionName: "assunzioni_board", statoFilter: statoFilter ?? null })
  const now = Date.now()
  const cached = assunzioniBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("assunzioni_board", {
      p_stato_filter: statoFilter ?? null,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`assunzioni_board failed: ${error.message}`)
    }

    const response = data as AssunzioniBoardRpcResponse | null
    return {
      rows: Array.isArray(response?.rows) ? response.rows : [],
    }
  })

  assunzioniBoardCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    assunzioniBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchAssunzioneDetail(rapportoId: string) {
  const cacheKey = JSON.stringify({ functionName: "assunzione_detail", rapportoId })
  const now = Date.now()
  const cached = assunzioneDetailCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("assunzione_detail", {
      p_rapporto_id: rapportoId,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`assunzione_detail failed: ${error.message}`)
    }

    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return null
    }

    return data as AssunzioneDetailRpcResponse
  })

  assunzioneDetailCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    assunzioneDetailCache.delete(cacheKey)
    throw error
  }
}

export async function fetchVariazioniBoard() {
  const cacheKey = JSON.stringify({ functionName: "variazioni_board" })
  const now = Date.now()
  const cached = variazioniBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("variazioni_board", {})
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`variazioni_board failed: ${error.message}`)
    }

    const response = data as VariazioniBoardRpcResponse | null
    return {
      cards: Array.isArray(response?.cards) ? response.cards : [],
      rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
    }
  })

  variazioniBoardCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    variazioniBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchRiattivazioniBoard() {
  const { data, error } = await supabase.rpc("riattivazioni_board", {})
  if (error) throw new Error(`riattivazioni_board failed: ${error.message}`)
  const response = (data ?? {}) as RiattivazioniBoardRpcResponse
  return {
    cards: Array.isArray(response.cards) ? response.cards : [],
  }
}

export async function fetchProveColloquiBoard(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("prove_colloqui_board", {
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw new Error(`prove_colloqui_board failed: ${error.message}`)
  const response = (data ?? {}) as ProveColloquiBoardRpcResponse
  return {
    rapporti: Array.isArray(response.rapporti) ? response.rapporti : [],
    selezioni: Array.isArray(response.selezioni) ? response.selezioni : [],
  }
}

export async function fetchLavoratoreExtras(workerId: string) {
  const { data, error } = await supabase.rpc("lavoratore_extras", { p_worker_id: workerId })
  if (error) throw new Error(`lavoratore_extras failed: ${error.message}`)
  return (data ?? {}) as LavoratoreExtrasRpcResponse
}

export async function fetchRicercaBoard(eagerStages: string[], deferredStages: string[]) {
  const cacheKey = JSON.stringify({ functionName: "ricerca_board", eagerStages, deferredStages })
  const now = Date.now()
  const cached = ricercaBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("ricerca_board", {
      p_eager_stages: eagerStages,
      p_deferred_stages: deferredStages,
    })
  ).then(({ data, error }) => {
    if (error) throw new Error(`ricerca_board failed: ${error.message}`)
    const response = data as RicercaBoardRpcResponse | null
    return {
      processes: Array.isArray(response?.processes) ? response.processes : [],
      deferredCounts: (response?.deferredCounts ?? {}) as Record<string, number>,
    }
  })

  ricercaBoardCache.set(cacheKey, { expiresAt: now + TABLE_QUERY_CACHE_TTL_MS, promise })

  try {
    return await promise
  } catch (error) {
    ricercaBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchChiusureBoard() {
  const cacheKey = JSON.stringify({ functionName: "chiusure_board" })
  const now = Date.now()
  const cached = chiusureBoardCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(supabase.rpc("chiusure_board", {})).then(({ data, error }) => {
    if (error) throw new Error(`chiusure_board failed: ${error.message}`)
    const response = data as ChiusureBoardRpcResponse | null
    return {
      cards: Array.isArray(response?.cards) ? response.cards : [],
      rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
    }
  })

  chiusureBoardCache.set(cacheKey, { expiresAt: now + TABLE_QUERY_CACHE_TTL_MS, promise })

  try {
    return await promise
  } catch (error) {
    chiusureBoardCache.delete(cacheKey)
    throw error
  }
}

export async function fetchSupportTicketsBundle(tipo: string) {
  const cacheKey = JSON.stringify({ functionName: "support_tickets_bundle", tipo })
  const now = Date.now()
  const cached = supportTicketsBundleCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = Promise.resolve(
    supabase.rpc("support_tickets_bundle", {
      p_tipo: tipo,
    })
  ).then(({ data, error }) => {
    if (error) {
      throw new Error(`support_tickets_bundle failed: ${error.message}`)
    }

    return (data ?? {}) as SupportTicketsBundleRpcResponse
  })

  supportTicketsBundleCache.set(cacheKey, {
    expiresAt: now + TABLE_QUERY_CACHE_TTL_MS,
    promise,
  })

  try {
    return await promise
  } catch (error) {
    supportTicketsBundleCache.delete(cacheKey)
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

export async function fetchProvincie(): Promise<ProvinciaRecord[]> {
  const now = Date.now()
  if (provincieCache && provincieCache.expiresAt > now) {
    return provincieCache.promise
  }

  const promise = supabase
    .from("provincie")
    .select("sigla, nome, nome_inglese")
    .order("sigla", { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        throw new Error(`fetchProvincie failed: ${error.message}`)
      }
      return (data ?? []) as ProvinciaRecord[]
    })

  provincieCache = {
    expiresAt: now + LOOKUP_VALUES_CACHE_TTL_MS,
    promise,
  }

  try {
    return await promise
  } catch (error) {
    provincieCache = null
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
