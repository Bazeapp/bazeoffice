import { supabase } from "@/lib/supabase-client"

import { adaptNotificaRow } from "../lib/adapters"
import type { Notifica } from "../types"

export async function markNotificaRead(notificaId: string): Promise<Notifica> {
  const { data, error } = await supabase.rpc("notifiche_mark_read", {
    p_notifica_id: notificaId,
  })
  if (error) {
    throw new Error(`notifiche_mark_read failed: ${error.message}`)
  }
  return adaptNotificaRow(data)
}
