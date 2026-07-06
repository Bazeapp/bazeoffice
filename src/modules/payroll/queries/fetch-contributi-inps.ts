import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { ContributoInpsRecord } from "../types/contributo-inps"

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
