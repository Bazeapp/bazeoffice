import { supabase } from "@/lib/supabase-client"

export async function markCommentRead(commentId: string): Promise<void> {
  const { error } = await supabase.rpc("commenti_mark_read", {
    p_comment_id: commentId,
  })
  if (error) {
    throw new Error(`commenti_mark_read failed: ${error.message}`)
  }
}
