import {
  E2E_CHIUSURE,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

const FIXTURE_CHIUSURA_IDS = Object.values(E2E_CHIUSURE.chiusure).map(
  (fixture) => fixture.id,
)

export async function readChiusuraStato(chiusuraId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("chiusure_contratti")
    .select("stato")
    .eq("id", chiusuraId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readChiusuraStato failed for ${chiusuraId}: ${error.message}`)
  }

  const row = data as { stato: string | null } | null
  return row?.stato ?? null
}

export async function setChiusuraStato(chiusuraId: string, stato: string | null) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/chiusure_contratti?id=eq.${chiusuraId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        stato,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E chiusura mutation failed (stato=${String(stato)}): HTTP ${response.status} ${body}`,
    )
  }
}

export async function unlinkRapportoFineChiusura(rapportoId: string) {
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
        fine_rapporto_lavorativo_id: null,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E unlinkRapportoFineChiusura failed for ${rapportoId}: HTTP ${response.status} ${body}`,
    )
  }
}

export async function cleanupAnnullamentoTestArtifacts() {
  const admin = getSupabaseAdmin()
  const rapportoId = E2E_CHIUSURE.annullamentoRapporto.id

  const { data, error } = await admin
    .from("rapporti_lavorativi")
    .select("fine_rapporto_lavorativo_id")
    .eq("id", rapportoId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E cleanupAnnullamentoTestArtifacts read failed: ${error.message}`)
  }

  const row = data as { fine_rapporto_lavorativo_id: string | null } | null
  const chiusuraId = row?.fine_rapporto_lavorativo_id ?? null
  if (chiusuraId && !FIXTURE_CHIUSURA_IDS.includes(chiusuraId)) {
    await unlinkRapportoFineChiusura(rapportoId)
    const { error: deleteError } = await admin
      .from("chiusure_contratti")
      .delete()
      .eq("id", chiusuraId)
    if (deleteError) {
      throw new Error(`E2E cleanupAnnullamentoTestArtifacts delete failed: ${deleteError.message}`)
    }
  } else {
    await unlinkRapportoFineChiusura(rapportoId)
  }
}

/** Restore chiusure board fixture rows to their db reset state. */
export async function resetChiusureFixture() {
  const { dimissioni, licenziamento, elaborata } = E2E_CHIUSURE.chiusure

  await cleanupAnnullamentoTestArtifacts()
  await Promise.all([
    setChiusuraStato(dimissioni.id, dimissioni.stato),
    setChiusuraStato(licenziamento.id, licenziamento.stato),
    setChiusuraStato(elaborata.id, elaborata.stato),
  ])
}
