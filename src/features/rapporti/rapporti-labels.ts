import type { RapportoLavorativoRecord } from "@/types"

type PersonNameInput = { cognome?: string | null; nome?: string | null }

function compactText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized || null
}

export function formatPersonName(person: PersonNameInput | null | undefined) {
  return [compactText(person?.cognome), compactText(person?.nome)].filter(Boolean).join(" ").trim() || null
}

export function getRapportoFamilyLabel(
  rapporto: Pick<RapportoLavorativoRecord, "cognome_nome_datore_proper"> | null | undefined,
  famiglia?: PersonNameInput | null
) {
  return formatPersonName(famiglia) ?? compactText(rapporto?.cognome_nome_datore_proper) ?? "Famiglia senza nome"
}

export function getRapportoWorkerLabel(
  rapporto: Pick<RapportoLavorativoRecord, "nome_lavoratore_per_url"> | null | undefined,
  lavoratore?: PersonNameInput | null
) {
  return formatPersonName(lavoratore) ?? compactText(rapporto?.nome_lavoratore_per_url) ?? "Lavoratore non associato"
}

export function getRapportoTitle(
  rapporto: Pick<
    RapportoLavorativoRecord,
    "cognome_nome_datore_proper" | "nome_lavoratore_per_url"
  > | null | undefined,
  related?: {
    famiglia?: PersonNameInput | null
    lavoratore?: PersonNameInput | null
  }
) {
  return `${getRapportoFamilyLabel(rapporto, related?.famiglia)} – ${getRapportoWorkerLabel(
    rapporto,
    related?.lavoratore
  )}`
}
