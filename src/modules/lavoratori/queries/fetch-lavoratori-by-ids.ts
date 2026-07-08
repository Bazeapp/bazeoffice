import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import type { LavoratoreRecord } from "../types/lavoratore"

export async function fetchLavoratoriByIds(ids: string[], roles?: string[]) {
  if (ids.length === 0) return { rows: [], total: 0, columns: [], groups: [] }
  const { data, error } = await supabase.rpc("lavoratori_by_ids", {
    p_ids: ids,
    p_roles: roles && roles.length > 0 ? roles : null,
  })
  if (error) throw new Error(`lavoratori_by_ids failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<LavoratoreRecord>)
}
