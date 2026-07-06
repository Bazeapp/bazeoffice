import { supabase } from "@/lib/supabase-client"
import type { CedolinoDetailRpcResponse } from "../types/payroll-rpc"

export async function fetchCedolinoDetail(id: string) {
  const { data, error } = await supabase.rpc("cedolino_detail", { p_id: id })
  if (error) {
    throw new Error(`cedolino_detail failed: ${error.message}`)
  }
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }
  return data as CedolinoDetailRpcResponse
}
