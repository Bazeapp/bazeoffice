import { supabase } from "@/lib/supabase-client"

import { adaptCommentRow } from "../lib/adapters"
import type { Comment, CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { EntityType } from "../types/entity"

export async function createComment(options: {
  pageEntityType: EntityType
  pageEntityId: string
  anchorEntityType: EntityType
  anchorEntityId: string
  body: string
  commentType: CommentType
  phaseLabel?: PhaseLabel | null
  sourceInterface?: SourceInterface | null
}): Promise<Comment> {
  const { data, error } = await supabase.rpc("commenti_create", {
    p_page_entity_type: options.pageEntityType,
    p_page_entity_id: options.pageEntityId,
    p_entity_type: options.anchorEntityType,
    p_entity_id: options.anchorEntityId,
    p_body: options.body,
    p_comment_type: options.commentType,
    p_phase_label: options.phaseLabel ?? null,
    p_source_interface: options.sourceInterface ?? null,
  })
  if (error) {
    throw new Error(`commenti_create failed: ${error.message}`)
  }
  return adaptCommentRow(data)
}
