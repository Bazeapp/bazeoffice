import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { PresenzaMensileRecord } from "../types/presenza-mensile"

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
