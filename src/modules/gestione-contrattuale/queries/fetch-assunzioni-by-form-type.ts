import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { type TableRow } from "@/lib/rpc-rows"

export async function fetchAssunzioniByFormType(formType: string, columns?: string) {
  const builder = supabase.rpc("assunzioni_by_form_type", { p_type: formType })
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`assunzioni_by_form_type failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}
