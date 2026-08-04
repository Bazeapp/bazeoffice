import { supabase } from "@/lib/supabase-client"

import { readCommentCount } from "../lib/rpc-response"
import type { EntityType } from "../types/entity"

export async function fetchCommentCountForPage(
  pageEntityType: EntityType,
  pageEntityId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("commenti_count_for_page", {
    p_page_entity_type: pageEntityType,
    p_page_entity_id: pageEntityId,
  })
  if (error) {
    throw new Error(`commenti_count_for_page failed: ${error.message}`)
  }
  return readCommentCount(data)
}
