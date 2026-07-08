import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { RapportoLavorativoRecord } from "../types/rapporto-lavorativo"

export async function fetchRapportiLavorativi(query: TablePageQuery) {
  return queryTable<RapportoLavorativoRecord>({
    table: "rapporti_lavorativi",
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
