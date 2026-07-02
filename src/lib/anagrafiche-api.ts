import { createRecord, deleteRecord, updateRecord } from "@/lib/record-crud"
import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { supabase } from "@/lib/supabase-client"
import {
  normalizeTableResponse,
  queryTable,
  type Gate1RpcFilter,
  type QueryFilterCondition,
  type QueryFilterGroup,
  type QueryFilterNode,
  type QueryFilterOperator,
  type TableColumnMeta,
  type TableFilterFieldType,
  type TableGroupResult,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import {
  beginPendingWrite,
  clearReadCaches,
  endPendingWrite,
  getMillisSinceLastLocalWrite,
  getPendingWriteCount,
  registerReadCacheInvalidator,
  runTracked,
  runTrackedEdgeFunction,
} from "@/lib/write-tracking"
import type { LookupValueRecord } from "@/types"
import type { ChiusuraContrattoRecord } from "@/types/entities/chiusura-contratto"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { FamigliaRecord } from "@/types"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { ProcessoMatchingRecord } from "@/types/entities/processi-matching"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"
import type { RapportoLavorativoRecord } from "@/types/entities/rapporto-lavorativo"
import type { RichiestaAttivazioneRecord } from "@/types"
import type { VariazioneContrattualeRecord } from "@/types/entities/variazione-contrattuale"

type TableRow = Record<string, unknown>

export type {
  Gate1RpcFilter,
  QueryFilterCondition,
  QueryFilterGroup,
  QueryFilterNode,
  QueryFilterOperator,
  TableColumnMeta,
  TableFilterFieldType,
  TableGroupResult,
  TablePageQuery,
  TableQueryResponse,
}

export {
  beginPendingWrite,
  clearReadCaches,
  createRecord,
  deleteRecord,
  endPendingWrite,
  getMillisSinceLastLocalWrite,
  getPendingWriteCount,
  normalizeTableResponse,
  runTracked,
  runTrackedEdgeFunction,
  updateRecord,
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

const LOOKUP_VALUES_CACHE_TTL_MS = 5 * 60 * 1000

type TableResponse<TRecord> = {
  rows: TRecord[]
  total: number
  columns: TableColumnMeta[]
  groups: TableGroupResult[]
}

let lookupValuesCache:
  | {
      expiresAt: number
      promise: Promise<TableResponse<LookupValueRecord>>
    }
  | null = null

registerReadCacheInvalidator(() => {
  lookupValuesCache = null
})

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

export async function fetchChiusureBoard() {
  const { data, error } = await supabase.rpc("chiusure_board", {})
  if (error) throw new Error(`chiusure_board failed: ${error.message}`)
  const response = data as ChiusureBoardRpcResponse | null
  return {
    cards: Array.isArray(response?.cards) ? response.cards : [],
    rapporti: Array.isArray(response?.rapporti) ? response.rapporti : [],
  }
}

export type AssunzioneNamePair = {
  info_anagrafiche_cognome: string | null
  info_anagrafiche_nome: string | null
}

export type RapportoAssunzioneNames = {
  datore: AssunzioneNamePair | null
  lavoratore: AssunzioneNamePair | null
}

/**
 * Mappa rapporto_id → nomi anagrafici delle assunzioni collegate (datore e
 * lavoratore). Usata dai board hook per dare priorità al nominativo del form
 * di assunzione nella composizione del nome del rapporto. Vedi
 * `getRapportoTitle` in features/rapporti/rapporti-labels.ts.
 */
export async function fetchAssunzioniNamesByRapportoIds(
  rapportoIds: string[]
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

// FASE 4 BIS — documenti lavoratore via RPC dedicata (ORDER BY identico al
// vecchio table-query). Usata dalla assunzioni-detail-sheet.
// (esperienze/referenze by_lavoratore rimosse: ora servite da ricerca_worker_scheda)
export async function fetchDocumentiLavoratoriByWorker(lavoratoreId: string) {
  const { data, error } = await supabase.rpc("documenti_lavoratori_by_lavoratore", {
    p_lavoratore_id: lavoratoreId,
  })
  if (error) throw new Error(`documenti_lavoratori_by_lavoratore failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<DocumentoLavoratoreRecord>)
}

// FASE 4 BIS — opzioni operatori (dropdown recruiter/operatori) via RPC.
// I role tokens sono calcolati lato client (getRoleTokens) e passati come array.
// `.select(...)` proietta solo le colonne usate dalla UI (Fix A — trim payload).
export async function fetchOperatoriOptionsRows(roleTokens: string[], activeOnly: boolean) {
  const { data, error } = await supabase
    .rpc("operatori_options", {
      p_role_tokens: roleTokens.length > 0 ? roleTokens : null,
      p_active_only: activeOnly,
    })
    .select("id,nome,cognome,ruolo,attivo")
  if (error) throw new Error(`operatori_options failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>).rows
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
      `ricerca_worker_related_selection_summaries failed: ${error.message}`
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

// ---------------------------------------------------------------------------
// FASE 4 BIS — "by_ids" RPC wrappers
//
// Sostituiscono il pattern table-query più frequente fuori da Anagrafiche: il
// lookup puntuale "id IN (...)". Le RPC (`<entita>_by_ids`) ritornano
// `setof <table>` → `data` è già un array di righe, quindi `normalizeTableResponse`
// lo avvolge nella stessa shape `{ rows, total, columns, groups }` dei fetch
// table-query, così i call site cambiano al minimo.
// ---------------------------------------------------------------------------

export async function fetchLavoratoriByIds(ids: string[], roles?: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("lavoratori_by_ids", {
    p_ids: ids,
    p_roles: roles && roles.length > 0 ? roles : null,
  })
  if (error) throw new Error(`lavoratori_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<LavoratoreRecord>)
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

// FASE 4 BIS — board RPC: enrichment "altre selezioni attive" in UNA chiamata.
// Sostituisce il fan-out selezioni_lookup + processi_matching_by_ids + famiglie_by_ids.
// Ritorna le righe già joinate (selezione + processo + famiglia) e già filtrate
// ai soli "direct involvement" lato server.
export async function fetchLavoratoriSelezioniCorrelate(workerIds: string[]) {
  if (workerIds.length === 0) return [] as TableRow[]
  const { data, error } = await supabase.rpc("lavoratori_selezioni_correlate", {
    p_worker_ids: workerIds,
  })
  if (error) throw new Error(`lavoratori_selezioni_correlate failed: ${error.message}`)
  return (Array.isArray(data) ? data : []) as TableRow[]
}

// FASE 4 BIS — Scheda RPC: tutto il dettaglio del lavoratore aperto in 1 chiamata
// (worker + indirizzi + documenti/esperienze/referenze + related_searches).
// Sostituisce lavoratori_by_ids + lavoratore_extras + indirizzi_by_entity +
// (su Cerca) selezioni + processi + famiglie del worker selezionato.
export type LavoratoreSchedaResult = {
  worker: TableRow | null
  indirizzi: TableRow[]
  documenti: TableRow[]
  esperienze: TableRow[]
  referenze: TableRow[]
  relatedSearches: TableRow[]
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

// FASE 4 BIS — scheda worker pipeline Ricerca in 1 chiamata (worker + indirizzi
// + esperienze/documenti/referenze + selezione corrente). Sostituisce 6 fetch
// parallele in ricerca-workers-pipeline-view.
export type RicercaWorkerSchedaResult = {
  worker: TableRow | null
  indirizzi: TableRow[]
  esperienze: TableRow[]
  documenti: TableRow[]
  referenze: TableRow[]
  selezione: TableRow | null
}

export async function fetchRicercaWorkerScheda(
  workerId: string,
  selectionId?: string | null
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

// FASE 4 BIS Wave 2 — indirizzi by entity + bbox geografico.
export async function fetchIndirizziByEntity(
  entitaTabella: string,
  entitaIds: string[],
  tipi?: string[],
) {
  if (entitaIds.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("indirizzi_by_entity", {
    p_entita_tabella: entitaTabella,
    p_entita_ids: entitaIds,
    p_tipi: tipi && tipi.length > 0 ? tipi : null,
  })
  if (error) throw new Error(`indirizzi_by_entity failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
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

// FASE 4 BIS Wave 3 — chiusura per id (dettaglio rapporto, eager).
export async function fetchChiusureByIds(ids: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("chiusure_by_ids", { p_ids: ids })
  if (error) throw new Error(`chiusure_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}

// FASE 4 BIS Wave 3 (lazy) — sezioni dettaglio rapporto + rapporto-by-id.
// columns: proiezione PostgREST per le RPC set-returning (returns setof <table>).
// Senza, la RPC serializza TUTTE le colonne della riga → payload enormi. Passando
// le sole colonne necessarie (come faceva il vecchio `select` di table-query) il
// payload crolla. Vale per qualunque chiamata RPC pesante.
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

const EMPTY_ROWS = { rows: [], total: 0, columns: [], groups: [] }

export async function fetchRapportiLavorativiByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("rapporti_lavorativi_by_ids", { p_ids: ids })
}

export async function fetchTicketByRapporto(rapportoId: string) {
  return rpcRows("ticket_by_rapporto", { p_rapporto_id: rapportoId })
}

export async function fetchVariazioniByRapporto(rapportoId: string) {
  return rpcRows("variazioni_by_rapporto", { p_rapporto_id: rapportoId })
}

// FASE 4 BIS Wave 4 — reload single-card board (by id).
export async function fetchVariazioniByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("variazioni_by_ids", { p_ids: ids })
}

export async function fetchRapportiLavorativiAll(limit = 3000, columns?: string) {
  return rpcRows("rapporti_lavorativi_all", { p_limit: limit }, columns)
}

// FASE 4 BIS Wave 4 — CRM assegnazione: processi per stato_res.
export async function fetchProcessiMatchingSearch(query: string, limit = 12) {
  if (!query.trim()) return EMPTY_ROWS
  return rpcRows("processi_matching_search", { p_query: query, p_limit: limit })
}

export async function fetchLavoratoriSearch(query: string, limit = 25) {
  if (!query.trim()) return EMPTY_ROWS
  return rpcRows("lavoratori_search", { p_query: query, p_limit: limit })
}

// FASE 4 BIS Wave 4 — heuristica nome (fallback): match esatto nome/cognome.
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

// FASE 4 BIS Wave 4 — selezioni: lookup unico (id / lavoratore / processo /
// stato, AND-combinati). Almeno un filtro deve essere fornito.
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
  // Accetta sia l'array piatto (fast-path) sia il gruppo annidato AND/OR:
  // cerca_lavoratori applica lavoratore_matches_filter_group quando riceve un gruppo.
  filters?: Gate1RpcFilter[] | QueryFilterGroup
  orderBy?: { field: string; ascending: boolean }
}) {
  return fetchGateLavoratoriRpc("cerca_lavoratori", query)
}

// FASE 4 BIS — board in UNA chiamata: list-RPC (cerca/gate1/gate2) + indirizzi
// grezzi + selezioni correlate grezze, tutto server-side. La FE raggruppa/
// processa con gli stessi builder di prima (colori/label client-side).
export async function fetchLavoratoriBoard(
  gate: "cerca" | "gate1" | "gate2",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
    includeRelated?: boolean
  }
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

async function fetchGateLavoratoriRpc(
  functionName: "gate1_lavoratori" | "gate2_lavoratori" | "cerca_lavoratori",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
  }
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

  const promise: Promise<ProvinciaRecord[]> = Promise.resolve(
    supabase
      .from("provincie")
      .select("sigla, nome, nome_inglese")
      .order("sigla", { ascending: true })
  ).then(({ data, error }) => {
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

// FASE 4 BIS — assunzioni via RPC dedicate (no table-query).
// `.select(columns)` per proiettare solo le colonne usate (Fix A).
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
