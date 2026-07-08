import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

import type { RiattivazioneStageId } from "../types"

type RiattivazioneStageDefinition = {
  id: RiattivazioneStageId
  label: string
  color: string
}

export const RIATTIVAZIONI_STAGE_DEFINITIONS: RiattivazioneStageDefinition[] = [
  { id: "da sentire", label: "Da sentire", color: "sky" },
  { id: "in attesa", label: "In attesa", color: "amber" },
  { id: "riattivato", label: "Riattivato", color: "emerald" },
  { id: "non riattiva", label: "Non riattiva", color: "rose" },
]

const DEFAULT_STAGE_ID: RiattivazioneStageId = "da sentire"

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

export function resolveStage(value: string | null | undefined): RiattivazioneStageId {
  const normalized = normalizeToken(value)
  const matchedStage = RIATTIVAZIONI_STAGE_DEFINITIONS.find(
    (stage) => normalizeToken(stage.id) === normalized || normalizeToken(stage.label) === normalized,
  )
  return matchedStage?.id ?? DEFAULT_STAGE_ID
}

export function hasRiattivazioneStatus(value: string | null | undefined) {
  return normalizeToken(value).length > 0
}

export function shouldShowUnclassifiedChiusura(rapporto: RapportoLavorativoRecord | null) {
  return normalizeToken(rapporto?.stato_servizio) === "non attivo"
}

export function getChiusuraTipoLabel(record: ChiusuraContrattoRecord) {
  return record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
}
