export const CHIUSURA_FORM_URLS = {
  licenziamento: "https://airtable.com/appevZURCPFkSG3CJ/pagdH4TXtF2mRHrHb/form",
  dimissione: "https://airtable.com/appevZURCPFkSG3CJ/pagC4sFam0eGz07Rh/form",
  annullamento: "https://airtable.com/appevZURCPFkSG3CJ/pagW6G5AUa4tJOWYX/form",
} as const

export const TIPO_ANNULLAMENTO = "Annullamento contratto"

/** Valori validi per "Tipo licenziamento/dimissione" (nessun lookup_values a DB). */
export const TIPO_LICENZIAMENTO_OPTIONS: string[] = [
  "Mancato superamento periodo di prova",
  "Licenziamento con preavviso",
  "Licenziamento senza preavviso",
  "Dimissioni durante il periodo di prova",
  "Dimissioni con preavviso",
  "Dimissioni senza preavviso",
  "Annullamento contratto",
  "Fine contratto a tempo determinato",
  "Rescissione abbonamento",
]

export function chiusureStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}

export type ChiusuraAttachmentSlot = "allegato_compilato" | "documenti_chiusura_rapporto"
