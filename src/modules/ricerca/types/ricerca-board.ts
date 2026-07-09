export type RicercaBoardCardData = {
  id: string
  stage: string
  nomeFamiglia: string
  cognomeFamiglia: string
  email: string
  telefono: string
  operatorId: string | null
  oreSettimanali: string
  giorniSettimanali: string
  deadline: string
  deadlineRaw: string | null
  zona: string
  tipoLavoroBadges?: string[]
  tipoLavoroColors?: Record<string, string | null>
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
}

export type RicercaBoardColumnData = {
  id: string
  label: string
  color: string | null
  totalCount: number
  deferred?: boolean
  isLoaded?: boolean
  isLoading?: boolean
  cards: RicercaBoardCardData[]
}
