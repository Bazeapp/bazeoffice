import {
  E2E_RIATTIVAZIONI,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"

const FIXTURE_CHIUSURA_IDS = Object.values(E2E_RIATTIVAZIONI.chiusure).map(
  (fixture) => fixture.id,
)

type RiattivazioneFixtureState = {
  stato_riattivazione_famiglia: string
  data_per_riattivazione: string | null
  sconto_proposto_riattivazione: string | null
}

const FIXTURE_DEFAULTS: Record<string, RiattivazioneFixtureState> = {
  [E2E_RIATTIVAZIONI.chiusure.daSentire.id]: {
    stato_riattivazione_famiglia: E2E_RIATTIVAZIONI.chiusure.daSentire.statoRiattivazione,
    data_per_riattivazione: null,
    sconto_proposto_riattivazione: null,
  },
  [E2E_RIATTIVAZIONI.chiusure.inAttesa.id]: {
    stato_riattivazione_famiglia: E2E_RIATTIVAZIONI.chiusure.inAttesa.statoRiattivazione,
    data_per_riattivazione: null,
    sconto_proposto_riattivazione: null,
  },
  [E2E_RIATTIVAZIONI.chiusure.riattivato.id]: {
    stato_riattivazione_famiglia: E2E_RIATTIVAZIONI.chiusure.riattivato.statoRiattivazione,
    data_per_riattivazione: null,
    sconto_proposto_riattivazione: "mese gratis",
  },
  [E2E_RIATTIVAZIONI.chiusure.ticketOrfana.id]: {
    stato_riattivazione_famiglia: E2E_RIATTIVAZIONI.chiusure.ticketOrfana.statoRiattivazione,
    data_per_riattivazione: null,
    sconto_proposto_riattivazione: null,
  },
}

export async function readRiattivazioneStato(chiusuraId: string) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/chiusure_contratti?id=eq.${chiusuraId}&select=stato_riattivazione_famiglia`,
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
      `E2E readRiattivazioneStato failed for ${chiusuraId}: HTTP ${response.status} ${body}`,
    )
  }

  const rows = (await response.json()) as Array<{
    stato_riattivazione_famiglia: string | null
  }>
  return rows[0]?.stato_riattivazione_famiglia ?? null
}

export async function setRiattivazioneFields(
  chiusuraId: string,
  patch: Partial<RiattivazioneFixtureState>,
) {
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
        ...patch,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E riattivazione mutation failed for ${chiusuraId}: HTTP ${response.status} ${body}`,
    )
  }
}

/** Restore riattivazioni board fixture rows to their db reset state. */
export async function resetRiattivazioniFixture() {
  await Promise.all(
    FIXTURE_CHIUSURA_IDS.map((chiusuraId) => {
      const defaults = FIXTURE_DEFAULTS[chiusuraId]
      if (!defaults) {
        throw new Error(`E2E resetRiattivazioniFixture: missing defaults for ${chiusuraId}`)
      }
      return setRiattivazioneFields(chiusuraId, defaults)
    }),
  )
}
