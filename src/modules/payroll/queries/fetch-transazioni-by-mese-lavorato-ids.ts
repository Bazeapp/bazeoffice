import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { fetchTransazioniFinanziarie } from "./fetch-transazioni-finanziarie"

export async function fetchTransazioniByMeseLavoratoIds(meseLavoratoIds: string[]) {
  if (meseLavoratoIds.length === 0) return EMPTY_TABLE_ROWS
  return fetchTransazioniFinanziarie({
    select: ["*"],
    limit: Math.max(meseLavoratoIds.length * 4, 200),
    offset: 0,
    orderBy: [{ field: "creato_il", ascending: false }],
    filters: {
      kind: "group",
      id: "transazioni-by-mese-lavorato",
      logic: "and",
      nodes: [
        {
          kind: "condition",
          id: "transazioni-by-mese-lavorato-in",
          field: "mese_lavorativo_id",
          operator: "in",
          value: meseLavoratoIds.join(","),
        },
      ],
    },
  })
}
