import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { TransazioneFinanziariaRecord } from "../types/transazione-finanziaria"

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
