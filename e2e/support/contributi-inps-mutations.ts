import {
  E2E_CONTRIBUTI_INPS,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

export async function readContributoInpsStato(contributoId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("contributi_inps")
    .select("stato_contributi_inps")
    .eq("id", contributoId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readContributoInpsStato failed for ${contributoId}: ${error.message}`)
  }

  const row = data as { stato_contributi_inps: string | null } | null
  return row?.stato_contributi_inps ?? null
}

export async function setContributoInpsStato(contributoId: string, stato: string | null) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/contributi_inps?id=eq.${contributoId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        stato_contributi_inps: stato,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E contributo INPS mutation failed (stato=${String(stato)}): HTTP ${response.status} ${body}`,
    )
  }
}

/** Restore contributi INPS board fixture rows to their db reset state. */
export async function resetContributiInpsFixture() {
  await Promise.all(
    Object.values(E2E_CONTRIBUTI_INPS.contributi).map((fixture) =>
      setContributoInpsStato(fixture.id, fixture.stato),
    ),
  )
}
