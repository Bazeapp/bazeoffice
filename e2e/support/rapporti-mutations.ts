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

export async function readRapportoNumberField(rapportoId: string, field: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("rapporti_lavorativi")
    .select(field)
    .eq("id", rapportoId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readRapportoNumberField failed for ${rapportoId}.${field}: ${error.message}`,
    )
  }

  const row = data as Record<string, unknown> | null
  const value = row?.[field]
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim()) return Number(value)
  return null
}

async function setRapportoNumberField(
  rapportoId: string,
  field: string,
  value: number | null,
) {
  const { error } = await getSupabaseAdmin()
    .from("rapporti_lavorativi")
    .update({
      [field]: value,
      aggiornato_il: new Date().toISOString(),
    })
    .eq("id", rapportoId)

  if (error) {
    throw new Error(
      `E2E setRapportoNumberField failed for ${rapportoId}.${field}: ${error.message}`,
    )
  }
}

/** Restore sidebar-editable fields on the rapporti lavorativi detail fixture. */
export async function resetRapportoDetailFixture(rapportoId: string) {
  await setRapportoNumberField(rapportoId, "codice_datore_webcolf", null)
  await setRapportoNumberField(rapportoId, "codice_dipendente_webcolf", null)
}

/** Restore sidebar-editable fields on the assunzioni detail sheet fixture. */
export async function resetAssunzioneSheetFixture(rapportoId: string) {
  await setRapportoNumberField(rapportoId, "codice_datore_webcolf", null)
  await setRapportoNumberField(rapportoId, "codice_dipendente_webcolf", null)
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
