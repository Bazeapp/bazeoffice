import {
  E2E_PROVE_COLLOQUI,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"

export async function readRapportoProvaStatoCs(rapportoId: string) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/rapporti_lavorativi?id=eq.${rapportoId}&select=prova_stato_cs`,
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
      `E2E readRapportoProvaStatoCs failed for ${rapportoId}: HTTP ${response.status} ${body}`,
    )
  }

  const rows = (await response.json()) as Array<{ prova_stato_cs: string | null }>
  return rows[0]?.prova_stato_cs ?? null
}

export async function setRapportoProvaStatoCs(
  rapportoId: string,
  provaStatoCs: string | null,
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/rapporti_lavorativi?id=eq.${rapportoId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        prova_stato_cs: provaStatoCs,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E rapporto mutation failed (prova_stato_cs=${String(provaStatoCs)}): HTTP ${response.status} ${body}`,
    )
  }
}

/** Restore prove board fixture rapporti to their db reset state. */
export async function resetProveColloquiFixture() {
  const { chiamareFamiglia, chiamareLavoratore, inAttesaInizio } = E2E_PROVE_COLLOQUI.rapporti

  await Promise.all([
    setRapportoProvaStatoCs(chiamareFamiglia.id, chiamareFamiglia.provaStatoCs),
    setRapportoProvaStatoCs(chiamareLavoratore.id, chiamareLavoratore.provaStatoCs),
    setRapportoProvaStatoCs(inAttesaInizio.id, inAttesaInizio.provaStatoCs),
  ])
}
