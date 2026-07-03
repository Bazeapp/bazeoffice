import fs from "node:fs"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

import {
  OPERATORS,
  OPERATOR_ROLES,
  assertLocalKeysConfigured,
  getAppOrigin,
  getLocalSupabaseConfig,
  type OperatorRole,
} from "./constants"

async function createStorageStateForRole(role: OperatorRole) {
  const operator = OPERATORS[role]
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getLocalSupabaseConfig()
  const authStorage = new Map<string, string>()

  const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => authStorage.get(key) ?? null,
        setItem: (key, value) => {
          authStorage.set(key, value)
        },
        removeItem: (key) => {
          authStorage.delete(key)
        },
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({
    email: operator.email,
    password: operator.password,
  })

  if (error) {
    throw new Error(
      `E2E global-setup: login failed for ${operator.email} (${role}): ${error.message}. ` +
        "Run `npm run e2e` (ensure-supabase + db reset) or check local Supabase.",
    )
  }

  const localStorage = [...authStorage.entries()].map(([name, value]) => ({
    name,
    value,
  }))

  if (localStorage.length === 0) {
    throw new Error(
      `E2E global-setup: no auth storage written for ${operator.email} (${role}).`,
    )
  }

  const storageState = {
    cookies: [] as [],
    origins: [
      {
        origin: getAppOrigin(),
        localStorage,
      },
    ],
  }

  const outputPath = path.resolve(operator.storageStatePath)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(storageState, null, 2))
}

export default async function globalSetup() {
  assertLocalKeysConfigured()

  for (const role of OPERATOR_ROLES) {
    await createStorageStateForRole(role)
  }
}
