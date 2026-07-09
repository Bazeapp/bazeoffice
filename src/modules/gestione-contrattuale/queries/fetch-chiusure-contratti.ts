import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { ChiusuraContrattoRecord } from "../types/chiusura-contratto"

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
