import { normalizeTableResponse, type TableQueryResponse } from "@/lib/table-query"
import { supabase } from "@/lib/supabase-client"
import { type TableRow } from "@/lib/rpc-rows"

export async function fetchIndirizziInBbox(options: {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  entitaTabella?: string
  limit?: number
  offset?: number
}) {
  const { data, error } = await supabase.rpc("indirizzi_in_bbox", {
    p_min_lat: options.minLat,
    p_max_lat: options.maxLat,
    p_min_lng: options.minLng,
    p_max_lng: options.maxLng,
    p_entita_tabella: options.entitaTabella ?? "lavoratori",
    p_limit: options.limit ?? 1000,
    p_offset: options.offset ?? 0,
  })
  if (error) throw new Error(`indirizzi_in_bbox failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}
