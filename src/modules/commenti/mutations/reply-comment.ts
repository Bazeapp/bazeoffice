import { supabase } from "@/lib/supabase-client"

import { adaptCommentRow } from "../lib/adapters"
import type { Comment, SourceInterface } from "../types/comment"
import type { EntityType } from "../types/entity"

export async function replyComment(options: {
  pageEntityType: EntityType
  pageEntityId: string
  threadRootId: string
  body: string
  sourceInterface?: SourceInterface | null
}): Promise<Comment> {
  const { data, error } = await supabase.rpc("commenti_reply", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_thread_root_id: options.threadRootId,
    p_body: options.body,
    p_source_interface: options.sourceInterface ?? null,
  })
  if (error) {
    throw new Error(`commenti_reply failed: ${error.message}`)
  }
  return adaptCommentRow(data)
}
