import { type Gate1RpcFilter, type QueryFilterGroup } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { asTableRowArray, type TableRow } from "@/lib/rpc-rows"

export async function fetchLavoratoriBoard(
  gate: "cerca" | "gate1" | "gate2",
  query: {
    limit: number
    offset: number
    search?: string
    filters?: Gate1RpcFilter[] | QueryFilterGroup
    orderBy?: { field: string; ascending: boolean }
    includeRelated?: boolean
  },
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
  const rows = asTableRowArray(payload.rows)
  return {
    rows,
    total: typeof payload.total === "number" ? payload.total : rows.length,
    indirizzi: asTableRowArray(payload.indirizzi),
    selezioniCorrelate: asTableRowArray(payload.selezioni_correlate),
  }
}
