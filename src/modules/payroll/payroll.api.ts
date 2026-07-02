import {
  queryTable,
  type TablePageQuery,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { rpcRows } from "@/lib/rpc-rows"

import type { ContributoInpsRecord } from "./types/contributo-inps"
import type { MeseCalendarioRecord } from "./types/mese-calendario"
import type { MeseLavoratoRecord } from "./types/mese-lavorato"
import type { PagamentoRecord } from "./types/pagamento"
import type { PresenzaMensileRecord } from "./types/presenza-mensile"
import type { TransazioneFinanziariaRecord } from "./types/transazione-finanziaria"
import type {
  CedolinoDetailRpcResponse,
  CedoliniBoardRpcResponse,
} from "./types/payroll-rpc"

const EMPTY_ROWS = { rows: [], total: 0, columns: [], groups: [] }

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

export async function fetchCedoliniBoard(yearMonth: string) {
  const { data, error } = await supabase.rpc("cedolini_board", { p_year_month: yearMonth })
  if (error) {
    throw new Error(`cedolini_board failed: ${error.message}`)
  }
  const response = data as CedoliniBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    total: typeof response?.total === "number" ? response.total : 0,
  }
}

export async function fetchCedolinoDetail(id: string) {
  const { data, error } = await supabase.rpc("cedolino_detail", { p_id: id })
  if (error) {
    throw new Error(`cedolino_detail failed: ${error.message}`)
  }
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }
  return data as CedolinoDetailRpcResponse
}

export async function fetchContributiInpsByRapporto(rapportoId: string) {
  return rpcRows("contributi_inps_by_rapporto", { p_rapporto_id: rapportoId })
}

export async function fetchMesiLavoratiByRapporto(rapportoId: string) {
  return rpcRows("mesi_lavorati_by_rapporto", { p_rapporto_id: rapportoId })
}

export async function fetchMesiCalendarioByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("mesi_calendario_by_ids", { p_ids: ids })
}

export async function fetchPagamentiByTicketIds(ticketIds: string[]) {
  if (ticketIds.length === 0) return EMPTY_ROWS
  return rpcRows("pagamenti_by_ticket_ids", { p_ticket_ids: ticketIds })
}

export async function fetchPresenzeByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("presenze_by_ids", { p_ids: ids })
}

export async function fetchTransazioniByMeseLavoratoIds(meseLavoratoIds: string[]) {
  if (meseLavoratoIds.length === 0) return EMPTY_ROWS
  return fetchTransazioniFinanziarie({
    select: ["*"],
    limit: Math.max(meseLavoratoIds.length * 4, 200),
    offset: 0,
    orderBy: [{ field: "creato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "transazioni-by-mese-lavorato",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "transazioni-by-mese-lavorato-in",
          field: "mese_lavorativo_id",
          operator: "in",
          value: meseLavoratoIds.join(","),
        },
      ],
    },
  })
}

export async function fetchPagamentiByTransazioneIds(transazioneIds: string[]) {
  if (transazioneIds.length === 0) return EMPTY_ROWS
  return fetchPagamenti({
    select: ["*"],
    limit: Math.max(transazioneIds.length * 4, 200),
    offset: 0,
    orderBy: [{ field: "creato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "pagamenti-by-transazione",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "pagamenti-by-transazione-in",
          field: "transazione_id",
          operator: "in",
          value: transazioneIds.join(","),
        },
      ],
    },
  })
}

export async function fetchContributiInpsByIds(ids: string[]) {
  if (ids.length === 0) return EMPTY_ROWS
  return rpcRows("contributi_inps_by_ids", { p_ids: ids })
}

export async function fetchContributiInpsByPeriod(start: string, end: string) {
  return rpcRows("contributi_inps_by_period", { p_start: start, p_end: end })
}

export async function fetchMesiCalendarioAll(limit = 500) {
  return rpcRows("mesi_calendario_all", { p_limit: limit })
}
