export type AssegnazioneCardData = {
  id: string
  famigliaId: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  deadlineMobile: string
  deadlineSales: string
  zona: string
  zonaQuartiere: string | null
  zonaCap: string | null
  zonaComune: string | null
  tipoLavoroBadges?: string[]
  tipoLavoroColors?: Record<string, string | null>
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  dataAssegnazione: string | null
  recruiterId: string | null
  statoRes: "da_assegnare" | "fare_ricerca"
  statoResLabel: string
  oreSettimanali: string
  giorniSettimanali: string
  orarioDiLavoro: string
  tipoRicerca: "nuova" | "sostituzione"
  overview: string
}
