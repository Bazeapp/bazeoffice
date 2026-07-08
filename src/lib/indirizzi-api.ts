import {
  normalizeTableResponse,
  queryTable,
  type TablePageQuery,
  type TableQueryResponse,
} from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

type TableRow = Record<string, unknown>

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
