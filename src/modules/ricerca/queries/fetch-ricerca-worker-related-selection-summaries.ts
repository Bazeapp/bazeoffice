import { supabase } from "@/lib/supabase-client"
import type { RicercaWorkerRelatedSelectionSummariesRpcResponse } from "../types/ricerca-rpc"

export async function fetchRicercaWorkerRelatedSelectionSummaries(query: {
  workerIds: string[]
  currentProcessId: string
}) {
  const uniqueWorkerIds = Array.from(new Set(query.workerIds.filter(Boolean))).sort()
  if (uniqueWorkerIds.length === 0) return []

const { data, error } = await supabase.rpc("ricerca_worker_related_selection_summaries", {
    p_worker_ids: uniqueWorkerIds,
    p_current_process_id: query.currentProcessId,
  })
  if (error) {
    throw new Error(
      `ricerca_worker_related_selection_summaries failed: ${error.message}`,
    )
  }
  const response = data as RicercaWorkerRelatedSelectionSummariesRpcResponse | null
  return Array.isArray(response?.rows) ? response.rows : []
}
