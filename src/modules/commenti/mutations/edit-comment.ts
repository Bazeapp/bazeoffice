import { supabase } from "@/lib/supabase-client"

import { adaptCommentRow } from "../lib/adapters"
import type { Comment } from "../types/comment"

export async function editComment(options: {
  commentId: string
  body: string
}): Promise<Comment> {
  const { data, error } = await supabase.rpc("commenti_edit", {
    p_comment_id: options.commentId,
    p_body: options.body,
  })
  if (error) {
    throw new Error(`commenti_edit failed: ${error.message}`)
  }
  return adaptCommentRow(data)
}
