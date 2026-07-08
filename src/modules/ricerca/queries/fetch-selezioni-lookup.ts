import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchSelezioniLookup(options: {
  ids?: string[]
  lavoratoreIds?: string[]
  processoIds?: string[]
  stati?: string[]
  columns?: string
}) {
  const p_ids = options.ids?.length ? options.ids : null
  const p_lavoratore_ids = options.lavoratoreIds?.length ? options.lavoratoreIds : null
  const p_processo_ids = options.processoIds?.length ? options.processoIds : null
  const p_stati = options.stati?.length ? options.stati : null
  if (!p_ids && !p_lavoratore_ids && !p_processo_ids && !p_stati) return EMPTY_TABLE_ROWS
  return rpcRows(
    "selezioni_lookup",
    { p_ids, p_lavoratore_ids, p_processo_ids, p_stati },
    options.columns,
  )
}
