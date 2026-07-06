import { EMPTY_TABLE_ROWS } from "@/lib/table-query"
import { rpcRows } from "@/lib/rpc-rows"

export async function fetchRichiesteAttivazioneLookup(options: {
  ids?: string[]
  processoResIds?: string[]
}) {
  const p_ids = options.ids?.length ? options.ids : null
  const p_processo_res_ids = options.processoResIds?.length ? options.processoResIds : null
  if (!p_ids && !p_processo_res_ids) return EMPTY_TABLE_ROWS
  return rpcRows("richieste_attivazione_lookup", { p_ids, p_processo_res_ids })
}
