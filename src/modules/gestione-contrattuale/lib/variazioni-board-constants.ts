import type { StageDefinition } from "@/lib/lookup-stage-metadata"

export const VARIAZIONI_BOARD_QUERY_KEY = ["variazioni-board"] as const

export const VARIAZIONI_REALTIME_TABLES = [
  "variazioni_contrattuali",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
  "indirizzi",
] as const

export const VARIAZIONI_DEFAULT_STAGE_DEFINITIONS: StageDefinition[] = [
  { id: "presa in carico", label: "presa in carico", color: "sky" },
  { id: "variazione effettuata", label: "variazione effettuata", color: "cyan" },
  { id: "documenti inviati", label: "documenti inviati", color: "teal" },
]

export function variazioniStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}

export function formatVariazioneBoardDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}
