import { supabase } from "@/lib/supabase-client"

import { readCommentListSectionRpcResponse } from "../lib/rpc-response"
import type { CommentListSectionRpcResponse } from "../types/comment-rpc"
import type { EntityType } from "../types/entity"

export async function fetchCommentSectionPage(options: {
  pageEntityType: EntityType
  pageEntityId: string
  sectionEntityType: EntityType
  sectionEntityId: string
  cursor?: string | null
}): Promise<CommentListSectionRpcResponse> {
  const { data, error } = await supabase.rpc("commenti_list_section", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_section_entity_type: options.sectionEntityType,
    p_section_entity_id: options.sectionEntityId,
    p_cursor: options.cursor ?? null,
  })
  if (error) {
    throw new Error(`commenti_list_section failed: ${error.message}`)
  }
  return readCommentListSectionRpcResponse(data)
}
