export type LookupOption = {
  valueKey: string
  valueLabel: string
  color: string | null
  sortOrder: number | null
}

export type LookupOptionsByField = Record<string, LookupOption[]>

export type CrmPipelineCardData = {
  id: string
  famigliaId: string
  numeroRicercaAttivata: string | null
  stage: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  tipoLavoroBadges?: string[]
  tipoLavoroColors?: Record<string, string | null>
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  statoRes: string
  qualificazioneLead: string
  motivoNoMatch: string
  modelloSmartmatching: string
  oreSettimana: string
  giorniSettimana: string
  giornatePreferite: string[]
  salesColdCallFollowup: string
  salesNoShowFollowup: string
  motivazioneLost: string
  motivazioneOot: string
  appuntiChiamataSales: string
  dataPerRicercaFutura: string
  dataCallPrenotata: string
  dataLeadRaw: string | null
  dataPerRicercaFuturaRaw: string | null
  dataCallPrenotataRaw: string | null
  tentativiChiamataCount: number
  preventivoAccettato: boolean
  richiestaAttivazioneId: string | null
  preventivoUrl: string | null
  preventivoTitolo: string | null
  preventivoSessionId: string | null
  preventivoAcceptanceUrl: string | null
  feeConcordata: number | null
  origineUrl: string | null
  scontoApplicatoRaw: string | null
  scontoApplicato: string
  orarioDiLavoro: string
  nucleoFamigliare: string
  descrizioneCasa: string
  metraturaCasa: string
  descrizioneAnimaliInCasa: string
  mansioniRichieste: string
  informazioniExtraRiservate: string
  etaMinima: string
  etaMassima: string
  indirizzoProvincia: string
  indirizzoProvinciaSigla: string
  indirizzoCap: string
  indirizzoNote: string
  indirizzoId: string | null
  indirizzoCompleto: string
  indirizzoVia: string
  indirizzoCivico: string
  indirizzoComune: string
  indirizzoCitofono: string
  srcEmbedMapsAnnucio: string
  deadlineMobile: string
  disponibilitaColloquiInPresenza: string
  familyAvailabilityJson?: string | null
  tipoIncontroFamigliaLavoratore: string
  richiestaPatente: boolean
  richiestaTrasferte: boolean
  richiestaFerie: boolean
  descrizioneRichiestaTrasferte: string
  descrizioneRichiestaFerie: string
  patenteDettaglio: string
  sesso: string | null
  nazionalitaEscluse: string[]
  nazionalitaObbligatorie: string[]
  famigliaMoltoEsigente: boolean
  richiestaAutonomia: boolean
  datoreSpessoPresente: boolean
  richiestaDiscrezione: boolean
  comunicareBeneItaliano: boolean
  comunicareBeneInglese: boolean
  presenzaNeonati: boolean
  piuBambini: boolean
  famiglia4Persone: boolean
  caniPiccoli: boolean
  caniGrandi: boolean
  gatti: boolean
  pulireRipianiAlti: boolean
  stirare: boolean
  stirareAbitiDifficili: boolean
  cucinare: boolean
  cucinareElaborato: boolean
  curaPiante: boolean
  testoAnnuncioWhatsapp: string
}

export type CrmPipelineColumnData = {
  id: string
  label: string
  color: string | null
  totalCount: number
  cards: CrmPipelineCardData[]
}

export type CrmPipelineFilters = {
  createdFrom?: string | null
  createdTo?: string | null
  tipoLavoro?: string[]
  preventivoAccettato?: boolean | null
  chiamataPrenotata?: boolean | null
}

export type GenericRow = Record<string, unknown>
