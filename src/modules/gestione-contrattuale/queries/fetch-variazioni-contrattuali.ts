import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { VariazioneContrattualeRecord } from "../types/variazione-contrattuale"

export async function fetchVariazioniContrattuali(query: TablePageQuery) {
  return queryTable<VariazioneContrattualeRecord>({
    table: "variazioni_contrattuali",
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
