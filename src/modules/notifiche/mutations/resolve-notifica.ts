import { supabase } from "@/lib/supabase-client"

import { adaptNotificaRow } from "../lib/adapters"
import type { Notifica } from "../types"

export async function resolveNotifica(notificaId: string): Promise<Notifica> {
  const { data, error } = await supabase.rpc("notifiche_resolve", {
    p_notifica_id: notificaId,
  })
  if (error) {
    throw new Error(`notifiche_resolve failed: ${error.message}`)
  }
  return adaptNotificaRow(data)
}
