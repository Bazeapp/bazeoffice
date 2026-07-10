import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"

export const EMPTY_SELECT_VALUE = "none"

export type ExperienceDraft = {
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
}

export function getExperienceDurationLabel(experience: EsperienzaLavoratoreRecord) {
  const start = experience.data_inizio ? new Date(experience.data_inizio) : null
  const end = experience.stato_esperienza_attiva
    ? new Date()
    : experience.data_fine
      ? new Date(experience.data_fine)
      : null

  if (
    !start ||
    Number.isNaN(start.getTime()) ||
    !end ||
    Number.isNaN(end.getTime())
  ) {
    return "-"
  }

  const diffMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())

  if (diffMonths < 12) {
    return "meno di 1 anno"
  }

  const years = Math.floor(diffMonths / 12)
  return years === 1 ? "1 anno" : `${years} anni`
}

export function getExperienceHeader({
  tipo_lavoro,
  tipo_rapporto,
  data_inizio,
  data_fine,
  stato_esperienza_attiva,
}: Pick<
  EsperienzaLavoratoreRecord,
  | "tipo_lavoro"
  | "tipo_rapporto"
  | "data_inizio"
  | "data_fine"
  | "stato_esperienza_attiva"
>) {
  const roleValues = Array.isArray(tipo_lavoro) ? tipo_lavoro : []
  const ruolo =
    roleValues.length > 0 ? roleValues.join(", ") : "Ruolo non indicato"
  const tipoRapporto = tipo_rapporto || "Rapporto non indicato"
  const durata = getExperienceDurationLabel({
    data_inizio,
    data_fine,
    stato_esperienza_attiva,
  } as EsperienzaLavoratoreRecord)
  return `${ruolo} | ${tipoRapporto} | ${durata}`
}

export function getExperienceReferenceStatus(
  references: ReferenzaLavoratoreRecord[],
): string | null {
  const statuses = references
    .map((reference) => reference.referenza_verificata ?? "")
    .filter(Boolean)

  if (statuses.includes("Referenza verificata")) {
    return "Referenza verificata"
  }

  if (statuses.includes("Referenza in attesa di verifica")) {
    return "Referenza in attesa di verifica"
  }

  if (statuses.includes("Referenza da richiedere")) {
    return "Referenza da richiedere"
  }

  return null
}

export function groupReferencesByExperienceId(
  references: ReferenzaLavoratoreRecord[],
) {
  const grouped = new Map<string, ReferenzaLavoratoreRecord[]>()
  for (const reference of references) {
    if (!reference.esperienza_lavoratore_id) continue
    const current = grouped.get(reference.esperienza_lavoratore_id) ?? []
    current.push(reference)
    grouped.set(reference.esperienza_lavoratore_id, current)
  }
  return grouped
}

export function sortExperiences(experiences: EsperienzaLavoratoreRecord[]) {
  return [...experiences].sort((left, right) => {
    const leftActive = left.stato_esperienza_attiva === true ? 1 : 0
    const rightActive = right.stato_esperienza_attiva === true ? 1 : 0
    if (leftActive !== rightActive) return rightActive - leftActive
    const leftDate = left.data_inizio ? new Date(left.data_inizio).getTime() : 0
    const rightDate = right.data_inizio ? new Date(right.data_inizio).getTime() : 0
    return rightDate - leftDate
  })
}

export function mapReferenceFormPatch(
  patch: Record<string, unknown>,
): Partial<ReferenzaLavoratoreRecord> {
  const out: Partial<ReferenzaLavoratoreRecord> = {}
  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case "referenza_verificata":
        out.referenza_verificata = value as string
        break
      case "nome_datore":
        out.nome_datore = (value as string).trim() || null
        break
      case "cognome_datore":
        out.cognome_datore = (value as string).trim() || null
        break
      case "telefono_datore":
        out.telefono_datore = (value as string).trim() || null
        break
      case "commento_esperienza":
        out.commento_esperienza = (value as string).trim() || null
        break
      case "valutazione":
        out.valutazione = value as number
        break
      case "referenza_verificata_da_baze":
        out.referenza_verificata_da_baze = value as boolean
        break
    }
  }
  return out
}

export function mapExperienceFormPatch(
  patch: Record<string, unknown>,
): Partial<EsperienzaLavoratoreRecord> {
  const out: Partial<EsperienzaLavoratoreRecord> = {}
  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case "tipo_lavoro":
        out.tipo_lavoro =
          (value as string[]).length > 0 ? (value as string[]) : null
        break
      case "tipo_rapporto":
        out.tipo_rapporto = (value as string) || null
        break
      case "data_inizio":
        out.data_inizio = (value as string) || null
        break
      case "data_fine":
        out.data_fine = (value as string) || null
        break
      case "stato_esperienza_attiva":
        out.stato_esperienza_attiva = value as boolean
        break
      case "descrizione":
        out.descrizione = (value as string).trim() || null
        break
      case "descrizione_contesto_lavorativo":
        out.descrizione_contesto_lavorativo = (value as string).trim() || null
        break
      case "motivazione_fine_rapporto":
        out.motivazione_fine_rapporto = (value as string).trim() || null
        break
    }
  }
  return out
}
