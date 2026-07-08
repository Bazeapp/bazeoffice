import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"

type TableRow = Record<string, unknown>

export async function fetchOperatoriOptionsRows(roleTokens: string[], activeOnly: boolean) {
  const { data, error } = await supabase
    .rpc("operatori_options", {
      p_role_tokens: roleTokens.length > 0 ? roleTokens : null,
      p_active_only: activeOnly,
    })
    .select("id,nome,cognome,ruolo,attivo")
  if (error) throw new Error(`operatori_options failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>).rows
}
