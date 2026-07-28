import { supabase } from "@/lib/supabase-client"

import { adaptNotificaCounts } from "../lib/adapters"
import type { NotificaCounts } from "../types"

export async function fetchNotificaCounts(): Promise<NotificaCounts> {
  const { data, error } = await supabase.rpc("notifiche_counts")
  if (error) {
    throw new Error(`notifiche_counts failed: ${error.message}`)
  }
  return adaptNotificaCounts(data)
}
