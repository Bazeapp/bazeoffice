import type { StageDefinition } from "@/lib/lookup-stage-metadata"

export const CHIUSURE_BOARD_QUERY_KEY = ["chiusure-board"] as const

export const CHIUSURE_REALTIME_TABLES = [
  "chiusure_contratti",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
] as const

export const LICENZIAMENTO_STAGE_ID = "Datore comunica licenziamento"

export const CHIUSURE_DEFAULT_STAGE_DEFINITIONS: StageDefinition[] = [
  { id: "Lavoratore comunica dimissioni", label: "Lavoratore comunica dimissioni", color: "violet" },
  { id: LICENZIAMENTO_STAGE_ID, label: LICENZIAMENTO_STAGE_ID, color: "zinc" },
  { id: "Chiusura pronta", label: "Chiusura pronta", color: "cyan" },
  { id: "Inviato comunicazione per firma documento", label: "Inviato comunicazione per firma documento", color: "sky" },
  { id: "Ricevuto documento firmato", label: "Ricevuto documento firmato", color: "lime" },
  { id: "Chiusura elaborata", label: "Chiusura elaborata", color: "amber" },
  { id: "Inviato documenti di chiusura", label: "Inviato documenti di chiusura", color: "lime" },
  { id: "Richiesta chiarimenti famiglia", label: "Richiesta chiarimenti famiglia", color: "orange" },
  { id: "Chiusura terminata", label: "Chiusura terminata", color: "green" },
]

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
