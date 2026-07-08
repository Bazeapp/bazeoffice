import { supabase } from "@/lib/supabase-client"
import type { CrmPipelineBoardRpcRow } from "../types/crm-rpc"

export async function fetchCrmPipelineFamigliaDetail(processId: string) {
  const { data, error } = await supabase.rpc("crm_pipeline_famiglia_detail", {
    p_process_id: processId,
  })

if (error) {
    throw new Error(`crm_pipeline_famiglia_detail failed: ${error.message}`)
  }

if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return null
  }

return data as CrmPipelineBoardRpcRow
}
