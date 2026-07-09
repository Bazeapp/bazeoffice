import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

export type RiattivazioneStageId =
  | "da sentire"
  | "in attesa"
  | "riattivato"
  | "non riattiva"

export type RiattivazioniBoardCardData = {
  id: string
  stage: RiattivazioneStageId
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  famigliaLabel: string
  lavoratoreLabel: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
}

export type RiattivazioniBoardColumnData = {
  id: RiattivazioneStageId
  label: string
  color: string
  cards: RiattivazioniBoardCardData[]
}
