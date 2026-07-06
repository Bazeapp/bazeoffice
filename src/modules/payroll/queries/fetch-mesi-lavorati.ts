import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { MeseLavoratoRecord } from "../types/mese-lavorato"

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
