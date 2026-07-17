import { supabase } from "@/lib/supabase-client"

import { adaptNotificaRow } from "../lib/adapters"
import type { Notifica } from "../types"

export async function reopenNotifica(notificaId: string): Promise<Notifica> {
  const { data, error } = await supabase.rpc("notifiche_reopen", {
    p_notifica_id: notificaId,
  })
  if (error) {
    throw new Error(`notifiche_reopen failed: ${error.message}`)
  }
  return adaptNotificaRow(data)
}
