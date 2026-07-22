import { supabase } from "@/lib/supabase-client"

/**
 * Resolves the signed-in user's `operatori.id`.
 *
 * Mentions, unread flags, and comment authors all key off `operatori.id`.
 * Auth `user.id` is not guaranteed to match (RPC lookup is by email), so the
 * comment panel must use this id — not the auth uid — as `currentUserId`.
 */
export async function fetchCurrentOperatorId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("commenti_current_operator_id")
  if (error) {
    throw new Error(`commenti_current_operator_id failed: ${error.message}`)
  }
  return typeof data === "string" && data.length > 0 ? data : null
}
