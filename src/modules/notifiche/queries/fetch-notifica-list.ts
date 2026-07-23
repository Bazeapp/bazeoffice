import { supabase } from "@/lib/supabase-client"

import { adaptNotificaList } from "../lib/adapters"
import type { NotificaListResult, NotificaTab } from "../types"

export async function fetchNotificaList(
  tab: NotificaTab,
  cursor?: string | null,
  limit = 40,
): Promise<NotificaListResult> {
  const { data, error } = await supabase.rpc("notifiche_list", {
    p_tab: tab,
    p_cursor: cursor ?? null,
    p_limit: limit,
  })
  if (error) {
    throw new Error(`notifiche_list failed: ${error.message}`)
  }
  return adaptNotificaList(data)
}
