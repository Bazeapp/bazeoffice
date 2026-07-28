import { supabase } from "@/lib/supabase-client"

import { readCommentListSectionRpcResponse } from "../lib/rpc-response"
import { stackAnchorExclusionsToRpc } from "../lib/stack-anchor-exclusions"
import type { CommentListSectionRpcResponse } from "../types/comment-rpc"
import type { EntityRef, EntityType } from "../types/entity"

export async function fetchDescendantsCommentPage(options: {
  pageEntityType: EntityType
  pageEntityId: string
  excludeAnchors: EntityRef[]
  cursor?: string | null
}): Promise<CommentListSectionRpcResponse> {
  const { data, error } = await supabase.rpc("commenti_list_descendants", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_exclude_anchors: stackAnchorExclusionsToRpc(options.excludeAnchors),
    p_cursor: options.cursor ?? null,
  })
  if (error) {
    throw new Error(`commenti_list_descendants failed: ${error.message}`)
  }
  return readCommentListSectionRpcResponse(data)
}
