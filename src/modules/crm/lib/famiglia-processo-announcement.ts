import type { CrmPipelineCardData } from "../types"
import type { FamigliaProcessoSectionId } from "./famiglia-processo-sections"

export const ANNOUNCEMENT_REQUIRED_FIELD_LABELS = {
  orarioDiLavoro: "Orario lavoro",
  oreSettimana: "Ore settimanali",
  giorniSettimana: "Giorni settimanali",
  giornatePreferite: "Giornate preferite",
  srcEmbedMapsAnnucio: "Src maps",
  indirizzoProvincia: "Prov",
  indirizzoCap: "Cap",
  indirizzoVia: "Via",
  indirizzoNote: "Quartiere",
  nucleoFamigliare: "Famiglia",
  descrizioneCasa: "Casa",
  metraturaCasa: "Metratura",
  mansioniRichieste: "Mansioni",
  sesso: "Genere",
} as const

export type AnnouncementRequiredField = keyof typeof ANNOUNCEMENT_REQUIRED_FIELD_LABELS

export const ANNOUNCEMENT_REQUIRED_FIELD_SECTION: Record<
  AnnouncementRequiredField,
  FamigliaProcessoSectionId
> = {
  orarioDiLavoro: "orari-frequenza",
  oreSettimana: "orari-frequenza",
  giorniSettimana: "orari-frequenza",
  giornatePreferite: "orari-frequenza",
  srcEmbedMapsAnnucio: "luogo-lavoro",
  indirizzoProvincia: "luogo-lavoro",
  indirizzoCap: "luogo-lavoro",
  indirizzoVia: "luogo-lavoro",
  indirizzoNote: "luogo-lavoro",
  nucleoFamigliare: "famiglia",
  descrizioneCasa: "casa",
  metraturaCasa: "casa",
  mansioniRichieste: "mansioni",
  sesso: "richieste-specifiche",
}

function hasRequiredValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.length > 0
  if (!value) return false
  const normalized = value.trim()
  return Boolean(normalized && normalized !== "-")
}

export function getMissingAnnouncementFields(
  card: CrmPipelineCardData | null
): AnnouncementRequiredField[] {
  if (!card) {
    return Object.keys(ANNOUNCEMENT_REQUIRED_FIELD_LABELS) as AnnouncementRequiredField[]
  }

  const values: Record<AnnouncementRequiredField, string | string[] | null | undefined> = {
    orarioDiLavoro: card.orarioDiLavoro,
    oreSettimana: card.oreSettimana,
    giorniSettimana: card.giorniSettimana,
    giornatePreferite: card.giornatePreferite,
    srcEmbedMapsAnnucio: card.srcEmbedMapsAnnucio,
    indirizzoProvincia: card.indirizzoProvincia,
    indirizzoCap: card.indirizzoCap,
    indirizzoVia: card.indirizzoVia,
    indirizzoNote: card.indirizzoNote,
    nucleoFamigliare: card.nucleoFamigliare,
    descrizioneCasa: card.descrizioneCasa,
    metraturaCasa: card.metraturaCasa,
    mansioniRichieste: card.mansioniRichieste,
    sesso: card.sesso,
  }

  return (Object.keys(values) as AnnouncementRequiredField[]).filter(
    (field) => !hasRequiredValue(values[field])
  )
}

export function formatMissingAnnouncementFieldLabels(
  missing: AnnouncementRequiredField[]
) {
  return missing.map((field) => ANNOUNCEMENT_REQUIRED_FIELD_LABELS[field]).join(", ")
}
