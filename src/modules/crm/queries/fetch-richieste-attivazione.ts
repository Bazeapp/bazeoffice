import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { RichiestaAttivazioneRecord } from "../types/richiesta-attivazione"

export async function fetchRichiesteAttivazione(query: TablePageQuery) {
  return queryTable<RichiestaAttivazioneRecord>({
    table: "richieste_attivazione",
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
