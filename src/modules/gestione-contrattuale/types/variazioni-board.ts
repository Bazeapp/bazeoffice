import type { RapportoLavorativoRecord, VariazioneContrattualeRecord } from "@/types"

export type VariazioniBoardCardData = {
  id: string
  stage: string
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
  nomeCompleto: string
  dataVariazione: string
  variazioneDaApplicare: string | null
}

export type VariazioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: VariazioniBoardCardData[]
}

export type VariazioniRapportoOption = {
  id: string
  label: string
  rapporto: RapportoLavorativoRecord
}
