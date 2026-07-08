import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { PagamentoRecord } from "../types/pagamento"

export async function fetchPagamenti(query: TablePageQuery) {
  return queryTable<PagamentoRecord>({
    table: "pagamenti",
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
