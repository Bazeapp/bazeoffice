import { E2E_LAVORATORI } from "../constants"

import { getSupabaseAdmin } from "./supabase-admin"

export async function readLavoratoreStringField(workerId: string, field: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("lavoratori")
    .select(field)
    .eq("id", workerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readLavoratoreStringField failed for ${workerId}.${field}: ${error.message}`,
    )
  }

  const row = data as Record<string, unknown> | null
  const value = row?.[field]
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return String(value)
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  return String(value)
}

export async function setLavoratoreStringField(
  workerId: string,
  field: string,
  value: string | number | null,
) {
  const { error } = await getSupabaseAdmin()
    .from("lavoratori")
    .update({
      [field]: value,
      aggiornato_il: new Date().toISOString(),
    })
    .eq("id", workerId)

  if (error) {
    throw new Error(
      `E2E setLavoratoreStringField failed for ${workerId}.${field}: ${error.message}`,
    )
  }
}

export async function readLavoratoreAddressField(workerId: string, field: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("indirizzi")
    .select(field)
    .eq("entita_tabella", "lavoratori")
    .eq("entita_id", workerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readLavoratoreAddressField failed for ${workerId}.${field}: ${error.message}`,
    )
  }

  const row = data as Record<string, unknown> | null
  const value = row?.[field]
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  return String(value)
}

async function readLavoratoreAddressId(workerId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("indirizzi")
    .select("id")
    .eq("entita_tabella", "lavoratori")
    .eq("entita_id", workerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readLavoratoreAddressId failed for ${workerId}: ${error.message}`,
    )
  }

  return (data as { id: string } | null)?.id ?? null
}

export async function setLavoratoreAddressField(
  workerId: string,
  field: string,
  value: string | null,
) {
  const addressId = await readLavoratoreAddressId(workerId)
  if (!addressId) {
    throw new Error(`E2E setLavoratoreAddressField: no address row for ${workerId}`)
  }

  const { error } = await getSupabaseAdmin()
    .from("indirizzi")
    .update({
      [field]: value,
      aggiornato_il: new Date().toISOString(),
    })
    .eq("id", addressId)

  if (error) {
    throw new Error(
      `E2E setLavoratoreAddressField failed for ${workerId}.${field}: ${error.message}`,
    )
  }
}

/** Restore Gate 1 fixture workers after detail tests mutate stato. */
export async function resetGate1Fixture() {
  const { qualificatoMi, qualificatoTo } = E2E_LAVORATORI.lavoratori
  await Promise.all([
    setLavoratoreStringField(qualificatoMi.id, "stato_lavoratore", "Qualificato"),
    setLavoratoreStringField(qualificatoMi.id, "motivazione_non_idoneo", null),
    setLavoratoreStringField(qualificatoTo.id, "stato_lavoratore", "Qualificato"),
    setLavoratoreStringField(qualificatoTo.id, "motivazione_non_idoneo", null),
  ])
}

/** Restore Gate 2 idoneo fixture worker status after certification tests. */
export async function resetGate2IdoneoFixture() {
  await setLavoratoreStringField(
    E2E_LAVORATORI.lavoratori.idoneoMi.id,
    "stato_lavoratore",
    "Idoneo",
  )
}

/** Restore sidebar-editable fields on the qualificatoMi cerca-lavoratori fixture. */
export async function resetCercaLavoratoriDetailFixture(workerId: string) {
  await Promise.all([
    setLavoratoreStringField(workerId, "descrizione_pubblica", null),
    setLavoratoreStringField(workerId, "telefono", null),
    setLavoratoreStringField(workerId, "vincoli_orari_disponibilita", null),
    setLavoratoreStringField(workerId, "check_accetta_paga_9_euro_netti", null),
    setLavoratoreStringField(workerId, "anni_esperienza_colf", null),
    setLavoratoreStringField(workerId, "livello_pulizie", null),
    setLavoratoreStringField(workerId, "stato_verifica_documenti", null),
    setLavoratoreAddressField(workerId, "citta", "Milano"),
  ])
}

export async function readLavoratoreLookupField(workerId: string, field: string) {
  const value = await readLavoratoreStringField(workerId, field)
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0]
      if (typeof first === "string") return first
    }
  } catch {
    // plain string lookup value
  }
  return value
}

export async function setLavoratoreLookupField(
  workerId: string,
  field: string,
  value: string | null,
) {
  await setLavoratoreStringField(workerId, field, value ? JSON.stringify([value]) : null)
}

export async function readWorkerSelezioneStato(processId: string, workerId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("selezioni_lavoratori")
    .select("stato_selezione")
    .eq("processo_matching_id", processId)
    .eq("lavoratore_id", workerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readWorkerSelezioneStato failed for ${processId}/${workerId}: ${error.message}`,
    )
  }

  const row = data as { stato_selezione: string | null } | null
  return row?.stato_selezione ?? null
}
