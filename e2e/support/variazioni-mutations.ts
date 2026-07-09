import {
  E2E_VARIAZIONI,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

const FIXTURE_VARIAZIONE_IDS = Object.values(E2E_VARIAZIONI.variazioni).map(
  (fixture) => fixture.id,
)

export async function readVariazioneStato(variazioneId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("variazioni_contrattuali")
    .select("stato")
    .eq("id", variazioneId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readVariazioneStato failed for ${variazioneId}: ${error.message}`)
  }

  const row = data as { stato: string | null } | null
  return row?.stato ?? null
}

export async function setVariazioneStato(variazioneId: string, stato: string | null) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/variazioni_contrattuali?id=eq.${variazioneId}`,
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
      `E2E variazione mutation failed (stato=${String(stato)}): HTTP ${response.status} ${body}`,
    )
  }
}

export async function cleanupCreateTestArtifacts() {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from("variazioni_contrattuali")
    .select("id")
    .eq("variazione_da_applicare", "E2E variazione creata da test")

  if (error) {
    throw new Error(`E2E cleanupCreateTestArtifacts read failed: ${error.message}`)
  }

  const rows = (data ?? []) as Array<{ id: string }>
  const transientIds = rows
    .map((row) => row.id)
    .filter((id) => !(FIXTURE_VARIAZIONE_IDS as readonly string[]).includes(id))

  if (transientIds.length === 0) return

  const { error: deleteError } = await admin
    .from("variazioni_contrattuali")
    .delete()
    .in("id", transientIds)

  if (deleteError) {
    throw new Error(`E2E cleanupCreateTestArtifacts delete failed: ${deleteError.message}`)
  }
}

/** Restore variazioni board fixture rows to their db reset state. */
export async function resetVariazioniFixture() {
  const { presaInCarico, variazioneEffettuata, documentiInviati } =
    E2E_VARIAZIONI.variazioni

  await cleanupCreateTestArtifacts()
  await Promise.all([
    setVariazioneStato(presaInCarico.id, presaInCarico.stato),
    setVariazioneStato(variazioneEffettuata.id, variazioneEffettuata.stato),
    setVariazioneStato(documentiInviati.id, documentiInviati.stato),
  ])
}
