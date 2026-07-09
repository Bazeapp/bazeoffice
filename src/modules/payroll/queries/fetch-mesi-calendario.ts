import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { MeseCalendarioRecord } from "../types/mese-calendario"

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
