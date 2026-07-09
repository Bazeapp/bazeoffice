import {
  E2E_CEDOLINI,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

export async function readCedolinoStato(cedolinoId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("mesi_lavorati")
    .select("stato_mese_lavorativo")
    .eq("id", cedolinoId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readCedolinoStato failed for ${cedolinoId}: ${error.message}`)
  }

  const row = data as { stato_mese_lavorativo: string | null } | null
  return row?.stato_mese_lavorativo ?? null
}

export async function setCedolinoStato(cedolinoId: string, stato: string | null) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/mesi_lavorati?id=eq.${cedolinoId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        stato_mese_lavorativo: stato,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E cedolino mutation failed (stato=${String(stato)}): HTTP ${response.status} ${body}`,
    )
  }
}

/** Restore cedolini board fixture rows to their db reset state. */
export async function resetCedoliniFixture() {
  await Promise.all(
    Object.values(E2E_CEDOLINI.cedolini).map((fixture) =>
      setCedolinoStato(fixture.id, fixture.stato),
    ),
  )
}
