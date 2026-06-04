import type { RapportoLavorativoRecord } from "@/types"

type PersonNameInput = { cognome?: string | null; nome?: string | null }

/**
 * Nome anagrafico catturato dal form di assunzione. È la fonte PRIORITARIA per
 * il nome del rapporto (datore e lavoratore): se il rapporto è collegato a
 * un'assunzione, il suo nominativo vince sui join famiglia/lavoratore e sui
 * campi denormalizzati. Stesso comportamento della board Assunzioni
 * (`resolveFamilyName` / `resolveWorkerName`). Quando l'assunzione non è
 * collegata o non ha nome, si applica il fallback storico.
 */
type AssunzioneNameInput = {
  info_anagrafiche_cognome?: string | null
  info_anagrafiche_nome?: string | null
}

function compactText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized || null
}

export function formatPersonName(person: PersonNameInput | null | undefined) {
  return [compactText(person?.cognome), compactText(person?.nome)].filter(Boolean).join(" ").trim() || null
}

export function formatAssunzioneName(assunzione: AssunzioneNameInput | null | undefined) {
  return (
    [compactText(assunzione?.info_anagrafiche_cognome), compactText(assunzione?.info_anagrafiche_nome)]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  )
}

export function getRapportoFamilyLabel(
  rapporto: Pick<RapportoLavorativoRecord, "cognome_nome_datore_proper"> | null | undefined,
  famiglia?: PersonNameInput | null,
  assunzioneDatore?: AssunzioneNameInput | null
) {
  return (
    formatAssunzioneName(assunzioneDatore) ??
    formatPersonName(famiglia) ??
    compactText(rapporto?.cognome_nome_datore_proper) ??
    "Famiglia senza nome"
  )
}

export function getRapportoWorkerLabel(
  rapporto: Pick<RapportoLavorativoRecord, "nome_lavoratore_per_url"> | null | undefined,
  lavoratore?: PersonNameInput | null,
  assunzioneLavoratore?: AssunzioneNameInput | null
) {
  return (
    formatAssunzioneName(assunzioneLavoratore) ??
    formatPersonName(lavoratore) ??
    compactText(rapporto?.nome_lavoratore_per_url) ??
    "Lavoratore non associato"
  )
}

export function getRapportoTitle(
  rapporto: Pick<
    RapportoLavorativoRecord,
    "cognome_nome_datore_proper" | "nome_lavoratore_per_url"
  > | null | undefined,
  related?: {
    famiglia?: PersonNameInput | null
    lavoratore?: PersonNameInput | null
    assunzioneDatore?: AssunzioneNameInput | null
    assunzioneLavoratore?: AssunzioneNameInput | null
  }
) {
  return `${getRapportoFamilyLabel(rapporto, related?.famiglia, related?.assunzioneDatore)} – ${getRapportoWorkerLabel(
    rapporto,
    related?.lavoratore,
    related?.assunzioneLavoratore
  )}`
}
