import type { FamigliaRecord, LavoratoreRecord, RapportoLavorativoRecord } from "@/types"

function compactText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized || null
}

export function formatPersonName(
  person: { cognome?: string | null; nome?: string | null } | null | undefined
) {
  return [compactText(person?.cognome), compactText(person?.nome)].filter(Boolean).join(" ").trim() || null
}

export function getRapportoFamilyLabel(
  rapporto: Pick<RapportoLavorativoRecord, "cognome_nome_datore_proper"> | null | undefined,
  famiglia?: FamigliaRecord | null
) {
  return formatPersonName(famiglia) ?? compactText(rapporto?.cognome_nome_datore_proper) ?? "Famiglia senza nome"
}

export function getRapportoWorkerLabel(
  rapporto: Pick<RapportoLavorativoRecord, "nome_lavoratore_per_url"> | null | undefined,
  lavoratore?: LavoratoreRecord | null
) {
  return formatPersonName(lavoratore) ?? compactText(rapporto?.nome_lavoratore_per_url) ?? "Lavoratore non associato"
}

export function getRapportoTitle(
  rapporto: Pick<
    RapportoLavorativoRecord,
    "cognome_nome_datore_proper" | "nome_lavoratore_per_url"
  > | null | undefined,
  related?: {
    famiglia?: FamigliaRecord | null
    lavoratore?: LavoratoreRecord | null
  }
) {
  return `${getRapportoFamilyLabel(rapporto, related?.famiglia)} – ${getRapportoWorkerLabel(
    rapporto,
    related?.lavoratore
  )}`
}
