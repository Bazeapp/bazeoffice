import { supabase } from "@/lib/supabase-client"
import { adaptTicketRecords } from "../lib/adapters"
import type { SupportTicketsBundleRpcResponse } from "../types/support-rpc"

export async function fetchSupportTicketsBundle(tipo: string) {
  const { data, error } = await supabase.rpc("support_tickets_bundle", { p_tipo: tipo })
  if (error) {
    throw new Error(`support_tickets_bundle failed: ${error.message}`)
  }
  const response = (data ?? {}) as SupportTicketsBundleRpcResponse
  return {
    ...response,
    tickets: adaptTicketRecords(response.tickets as Record<string, unknown>[] | undefined),
  } satisfies SupportTicketsBundleRpcResponse
}
