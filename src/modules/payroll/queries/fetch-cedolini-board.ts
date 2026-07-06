import { supabase } from "@/lib/supabase-client"
import type { CedoliniBoardRpcResponse } from "../types/payroll-rpc"

export async function fetchCedoliniBoard(yearMonth: string) {
  const { data, error } = await supabase.rpc("cedolini_board", { p_year_month: yearMonth })
  if (error) {
    throw new Error(`cedolini_board failed: ${error.message}`)
  }
  const response = data as CedoliniBoardRpcResponse | null
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    total: typeof response?.total === "number" ? response.total : 0,
  }
}
