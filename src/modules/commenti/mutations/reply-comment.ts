import { supabase } from "@/lib/supabase-client"

import { adaptCommentRow } from "../lib/adapters"
import type { Comment } from "../types/comment"
import type { EntityType } from "../types/entity"

export async function replyComment(options: {
  pageEntityType: EntityType
  pageEntityId: string
  threadRootId: string
  body: string
}): Promise<Comment> {
  const { data, error } = await supabase.rpc("commenti_reply", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_thread_root_id: options.threadRootId,
    p_body: options.body,
  })
  if (error) {
    throw new Error(`commenti_reply failed: ${error.message}`)
  }
  return adaptCommentRow(data)
}
