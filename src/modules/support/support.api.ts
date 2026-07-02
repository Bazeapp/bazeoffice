import { queryTable, type TablePageQuery } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

import { adaptTicketRecords } from "./support.adapters"
import type { TicketRecord } from "./types/ticket"
import type {
  ProveColloquiBoardRpcResponse,
  RiattivazioniBoardRpcResponse,
  SupportTicketsBundleRpcResponse,
} from "./types/support-rpc"

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

export async function fetchSupportTicketsBundle(tipo: string) {
  const { data, error } = await supabase.rpc("support_tickets_bundle", { p_tipo: tipo })
  if (error) {
    throw new Error(`support_tickets_bundle failed: ${error.message}`)
  }
  const response = (data ?? {}) as SupportTicketsBundleRpcResponse
  return {
    ...response,
    tickets: adaptTicketRecords(response.tickets as Record<string, unknown>[] | undefined),
  } satisfies SupportTicketsBundleRpcResponse
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
