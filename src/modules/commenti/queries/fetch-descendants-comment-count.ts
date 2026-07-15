import { supabase } from "@/lib/supabase-client"

import { readCommentCount } from "../lib/rpc-response"
import { stackAnchorExclusionsToRpc } from "../lib/stack-anchor-exclusions"
import type { EntityRef, EntityType } from "../types/entity"

export async function fetchDescendantsCommentCount(options: {
  pageEntityType: EntityType
  pageEntityId: string
  excludeAnchors: EntityRef[]
}): Promise<number> {
  const { data, error } = await supabase.rpc("commenti_count_for_descendants", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_exclude_anchors: stackAnchorExclusionsToRpc(options.excludeAnchors),
  })
  if (error) {
    throw new Error(`commenti_count_for_descendants failed: ${error.message}`)
  }
  return readCommentCount(data)
}
