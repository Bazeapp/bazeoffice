import { queryTable, type TablePageQuery } from "@/lib/table-query"
import type { TicketRecord } from "../types/ticket"

export async function fetchTickets(query: TablePageQuery) {
  return queryTable<TicketRecord>({
    table: "ticket",
    select: query.select ?? ["*"],
    limit: query.limit,
    offset: query.offset,
    orderBy: query.orderBy ?? [{ field: "data_apertura", ascending: false }],
    includeSchema: query.includeSchema,
    search: query.search,
    searchFields: query.searchFields,
    filters: query.filters,
    groupBy: query.groupBy,
  })
}
