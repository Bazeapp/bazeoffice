import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { fetchPagamenti } from "./fetch-pagamenti"

export async function fetchPagamentiByTransazioneIds(transazioneIds: string[]) {
  if (transazioneIds.length === 0) return EMPTY_TABLE_ROWS
  return fetchPagamenti({
    select: ["*"],
    limit: Math.max(transazioneIds.length * 4, 200),
    offset: 0,
    orderBy: [{ field: "creato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "pagamenti-by-transazione",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "pagamenti-by-transazione-in",
          field: "transazione_id",
          operator: "in",
          value: transazioneIds.join(","),
        },
      ],
    },
  })
}
