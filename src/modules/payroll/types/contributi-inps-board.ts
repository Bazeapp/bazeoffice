import type {
  ContributoInpsRecord,
  MeseCalendarioRecord,
  RapportoLavorativoRecord,
} from "@/types"

export type ContributoQuarterValue = "Q1" | "Q2" | "Q3" | "Q4"

export type ContributoInpsBoardCardData = {
  id: string
  stage: string
  record: ContributoInpsRecord
  rapporto: RapportoLavorativoRecord | null
  trimestre: MeseCalendarioRecord | null
  nomeFamiglia: string
  nomeLavoratore: string
  nomeCompleto: string
  trimestreLabel: string
  importoLabel: string | null
  pagopaLabel: string | null
}
