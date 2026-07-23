import { supabase } from "@/lib/supabase-client"

export async function markAllNotificheRead(): Promise<number> {
  const { data, error } = await supabase.rpc("notifiche_mark_all_read")
  if (error) {
    throw new Error(`notifiche_mark_all_read failed: ${error.message}`)
  }
  if (data && typeof data === "object" && "updated" in data) {
    const updated = (data as { updated: unknown }).updated
    if (typeof updated === "number" && Number.isFinite(updated)) return updated
  }
  return 0
}
