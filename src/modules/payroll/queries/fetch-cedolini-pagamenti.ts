import { supabase } from "@/lib/supabase-client"

export type CedoliniPagamentiReminderFlagRow = {
  id: string
  check_reminder_pagamento_inviato: boolean | null
  count_reminder_pagamento_inviati: number | null
  data_ultimo_reminder_pagamento: string | null
}

/**
 * Reminder tracking for Pagamenti (BAZ-98/99/100 U6, R7; BAZ-179) is NOT
 * returned by the `cedolini_board` RPC — this dedicated fetch enriches just
 * the Pagamenti candidate ids (`getPagamentiCandidateCards`) with the
 * reminded flag plus send history (count + last send).
 *
 * Authenticated users have full SELECT RLS on `mesi_lavorati` (same
 * direct-`.from()` pattern as `fetchCedoliniBulkJob`), so this needs neither
 * a new edge function nor a new `table-query` allow-list entry (A-S8).
 */
export async function fetchCedoliniPagamentiReminderFlags(
  meseLavorativoIds: string[],
): Promise<CedoliniPagamentiReminderFlagRow[]> {
  if (meseLavorativoIds.length === 0) return []

  const { data, error } = await supabase
    .from("mesi_lavorati")
    .select(
      "id, check_reminder_pagamento_inviato, count_reminder_pagamento_inviati, data_ultimo_reminder_pagamento",
    )
    .in("id", meseLavorativoIds)

  if (error) {
    throw new Error(`fetchCedoliniPagamentiReminderFlags failed: ${error.message}`)
  }

  return (data ?? []) as CedoliniPagamentiReminderFlagRow[]
}
