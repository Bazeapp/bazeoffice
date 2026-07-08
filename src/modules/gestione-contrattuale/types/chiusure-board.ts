import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

export type TipoLicenziamentoOption = { value: string; label: string }

export type ChiusureBoardCardData = {
  id: string
  stage: string
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
  tipoColor: string | null
  hasAssunzioneDatore: boolean
  hasAssunzioneLavoratore: boolean
}

export type ChiusureBoardColumnData = {
  id: string
  label: string
  color: string
  cards: ChiusureBoardCardData[]
}
