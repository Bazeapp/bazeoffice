import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { type TableRow } from "@/lib/rpc-rows"

export async function fetchChiusureByIds(ids: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("chiusure_by_ids", { p_ids: ids })
  if (error) throw new Error(`chiusure_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}
