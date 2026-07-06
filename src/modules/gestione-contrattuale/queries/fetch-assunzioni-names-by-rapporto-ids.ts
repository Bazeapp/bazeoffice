import { supabase } from "@/lib/supabase-client"
import type { RapportoAssunzioneNames } from "../types/gestione-rpc"

export async function fetchAssunzioniNamesByRapportoIds(
  rapportoIds: string[],
): Promise<Record<string, RapportoAssunzioneNames>> {
  if (rapportoIds.length === 0) return {}
  const uniqueIds = Array.from(new Set(rapportoIds))
  const { data, error } = await supabase.rpc("assunzioni_names_by_rapporto_ids", {
    p_ids: uniqueIds,
  })
  if (error) throw new Error(`assunzioni_names_by_rapporto_ids failed: ${error.message}`)
  return (data ?? {}) as Record<string, RapportoAssunzioneNames>
}
