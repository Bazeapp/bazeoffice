import type { StageDefinition } from "@/lib/lookup-stage-metadata"

export const ASSUNZIONI_BOARD_QUERY_KEY = ["assunzioni-board"] as const

export const ASSUNZIONI_REALTIME_TABLES = [
  "assunzioni",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
  "processi_matching",
  "richieste_attivazione",
] as const

export const ASSUNZIONI_DEFAULT_STAGE_DEFINITIONS: StageDefinition[] = [
  { id: "Avviare pratica", label: "Avviare pratica", color: "sky" },
  { id: "Inviata richiesta dati", label: "Inviata richiesta dati", color: "sky" },
  { id: "In attesa di dati famiglia", label: "In attesa di dati famiglia", color: "teal" },
  { id: "In attesa di dati lavoratore", label: "In attesa di dati lavoratore", color: "teal" },
  { id: "Dati pronti per assunzione", label: "Dati pronti per assunzione", color: "amber" },
  { id: "Assunzione fatta", label: "Assunzione fatta", color: "lime" },
  { id: "Documenti assunzione inviati", label: "Documenti assunzione inviati", color: "green" },
  { id: "Contratto firmato", label: "Contratto firmato", color: "green" },
  { id: "Non assume con Baze", label: "Non assume con Baze", color: "orange" },
]

export const ASSUNZIONI_DEFERRED_STAGE_IDS = new Set([
  "Contratto firmato",
  "Non assume con Baze",
])

export const ASSUNZIONI_FORM_URLS = {
  datore: "https://airtable.com/appevZURCPFkSG3CJ/pag5YgoOJ0v7SF8Md/form",
  lavoratore: "https://airtable.com/appevZURCPFkSG3CJ/pagyXYipcEfKXSUVj/form",
} as const

export function assunzioniStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}
