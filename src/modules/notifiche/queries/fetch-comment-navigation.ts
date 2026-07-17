import { supabase } from "@/lib/supabase-client"

import { adaptCommentNavigation } from "../lib/adapters"
import type { CommentNavigation } from "../types"

export async function fetchCommentNavigation(
  commentId: string,
): Promise<CommentNavigation | null> {
  const { data, error } = await supabase.rpc("commenti_navigation_for_comment", {
    p_comment_id: commentId,
  })
  if (error) {
    throw new Error(`commenti_navigation_for_comment failed: ${error.message}`)
  }
  return adaptCommentNavigation(data)
}
