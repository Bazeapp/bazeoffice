import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { assertLocalKeysConfigured, getLocalSupabaseConfig } from "../constants"

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin() {
  assertLocalKeysConfigured()
  if (!adminClient) {
    const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()
    adminClient = createClient(VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return adminClient
}
