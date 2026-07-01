import { getSupabaseAdmin } from "./supabase-admin"

/** Remove all worker selections for a process (E2E cleanup after manual add / smart matching). */
export async function deleteAllSelezioneForProcess(processId: string) {
  const { error } = await getSupabaseAdmin()
    .from("selezioni_lavoratori")
    .delete()
    .eq("processo_matching_id", processId)

  if (error) {
    throw new Error(
      `E2E deleteAllSelezioneForProcess failed for ${processId}: ${error.message}`,
    )
  }
}

export async function deleteWorkerSelezione(processId: string, workerId: string) {
  const { error } = await getSupabaseAdmin()
    .from("selezioni_lavoratori")
    .delete()
    .eq("processo_matching_id", processId)
    .eq("lavoratore_id", workerId)

  if (error) {
    throw new Error(
      `E2E deleteWorkerSelezione failed for process ${processId} worker ${workerId}: ${error.message}`,
    )
  }
}

export async function readProcessoStringField(processId: string, field: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("processi_matching")
    .select(field)
    .eq("id", processId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readProcessoStringField failed for ${processId}.${field}: ${error.message}`,
    )
  }

  const row = data as Record<string, unknown> | null
  const value = row?.[field]
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return String(value)
  if (typeof value === "string") return value
  return String(value)
}

export async function setProcessoStringField(
  processId: string,
  field: string,
  value: string | boolean | null,
) {
  const { error } = await getSupabaseAdmin()
    .from("processi_matching")
    .update({
      [field]: value,
      aggiornato_il: new Date().toISOString(),
    })
    .eq("id", processId)

  if (error) {
    throw new Error(
      `E2E setProcessoStringField failed for ${processId}.${field}: ${error.message}`,
    )
  }
}

/** Restore sidebar-editable fields on the unassigned nuova fixture (b009). */
export async function resetRicercaDetailSidebarFixture(
  processId: string,
  famigliaId: string,
) {
  await Promise.all([
    setProcessoStringField(processId, "orario_di_lavoro", null),
    setProcessoStringField(processId, "ore_settimanale", "40"),
    setProcessoStringField(processId, "numero_giorni_settimanali", "5"),
    setProcessoStringField(processId, "preferenza_giorno", null),
    setProcessoStringField(processId, "indirizzo_prova_note", "Centro"),
    setProcessoStringField(processId, "nucleo_famigliare", null),
    setProcessoStringField(processId, "descrizione_casa", null),
    setProcessoStringField(processId, "metratura_casa", null),
    setProcessoStringField(processId, "descrizione_animali_in_casa", null),
    setProcessoStringField(processId, "mansioni_richieste", null),
    setProcessoStringField(processId, "richiesta_patente", false),
    setProcessoStringField(processId, "eta_minima", null),
    setProcessoStringField(processId, "eta_massima", null),
    setProcessoStringField(processId, "disponibilita_colloqui_in_presenza", null),
    setProcessoStringField(processId, "testo_annuncio_whatsapp", null),
    setProcessoStringField(processId, "recruiter_ricerca_e_selezione_id", null),
  ])

  const { error: indirizziError } = await getSupabaseAdmin()
    .from("indirizzi")
    .delete()
    .eq("entita_tabella", "processi_matching")
    .eq("entita_id", processId)

  if (indirizziError) {
    throw new Error(
      `E2E resetRicercaDetailSidebarFixture indirizzi failed: ${indirizziError.message}`,
    )
  }

  const { error } = await getSupabaseAdmin()
    .from("famiglie")
    .update({ telefono: null, aggiornato_il: new Date().toISOString() })
    .eq("id", famigliaId)

  if (error) {
    throw new Error(
      `E2E resetRicercaDetailSidebarFixture famiglia failed: ${error.message}`,
    )
  }
}
