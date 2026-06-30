import {
  E2E_ASSUNZIONI,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

export async function readRapportoStatoAssunzione(rapportoId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("rapporti_lavorativi")
    .select("stato_assunzione")
    .eq("id", rapportoId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readRapportoStatoAssunzione failed for ${rapportoId}: ${error.message}`,
    )
  }

  const row = data as { stato_assunzione: string | null } | null
  return row?.stato_assunzione ?? null
}

export async function setRapportoStatoAssunzione(
  rapportoId: string,
  statoAssunzione: string | null,
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
        stato_assunzione: statoAssunzione,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E rapporto mutation failed (stato_assunzione=${String(statoAssunzione)}): HTTP ${response.status} ${body}`,
    )
  }
}

/** Restore assunzioni board fixture rapporti to their db reset state. */
export async function resetAssunzioniFixture() {
  const {
    avviarePratica,
    inviataRichiestaDati,
    inAttesaDatiFamiglia,
    contrattoFirmatoAttivo,
    contrattoFirmatoTerminato,
    nonAssumeConBaze,
  } = E2E_ASSUNZIONI.rapporti

  await Promise.all([
    setRapportoStatoAssunzione(avviarePratica.id, avviarePratica.statoAssunzione),
    setRapportoStatoAssunzione(inviataRichiestaDati.id, inviataRichiestaDati.statoAssunzione),
    setRapportoStatoAssunzione(inAttesaDatiFamiglia.id, inAttesaDatiFamiglia.statoAssunzione),
    setRapportoStatoAssunzione(
      contrattoFirmatoAttivo.id,
      contrattoFirmatoAttivo.statoAssunzione,
    ),
    setRapportoStatoAssunzione(
      contrattoFirmatoTerminato.id,
      contrattoFirmatoTerminato.statoAssunzione,
    ),
    setRapportoStatoAssunzione(nonAssumeConBaze.id, nonAssumeConBaze.statoAssunzione),
  ])
}
