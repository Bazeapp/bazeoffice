import { assertLocalKeysConfigured, getLocalSupabaseConfig } from "../constants"

export async function readFamigliaField(
  famigliaId: string,
  field: "nome" | "cognome" | "email",
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/famiglie?id=eq.${famigliaId}&select=${field}`,
    {
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
      },
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E readFamigliaField failed (${field}): HTTP ${response.status} ${body}`,
    )
  }

  const rows = (await response.json()) as Array<Record<string, string | null>>
  return rows[0]?.[field] ?? null
}

export async function updateFamigliaField(
  famigliaId: string,
  field: "nome" | "cognome" | "email",
  value: string,
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/famiglie?id=eq.${famigliaId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        [field]: value,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E famiglia mutation failed (${field}=${value}): HTTP ${response.status} ${body}`,
    )
  }
}
