import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { ProcessoMatchingRecord } from "../types/processi-matching"

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
