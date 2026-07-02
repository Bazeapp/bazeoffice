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
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"

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

export async function fetchTicketByRapporto(rapportoId: string) {
  return rpcRows("ticket_by_rapporto", { p_rapporto_id: rapportoId })
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
