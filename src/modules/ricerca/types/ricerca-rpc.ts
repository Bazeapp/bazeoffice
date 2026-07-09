export type RicercaWorkerRelatedSelectionSummary = {
  worker_id: string
  count: number
  dots: Array<{
    process_id: string
    stato_selezione: string
  }>
}

export type RicercaWorkerRelatedSelectionSummariesRpcResponse = {
  rows?: RicercaWorkerRelatedSelectionSummary[]
}

export type RicercaBoardRpcProcess = {
  id: string
  stato_res: string | null
  famiglia_id: string | null
  recruiter_ricerca_e_selezione_id: string | null
  referente_ricerca_e_selezione_id: string | null
  ore_settimanale: string | number | null
  numero_giorni_settimanali: string | null
  deadline_mobile: string | null
  tipo_lavoro: unknown
  tipo_rapporto: unknown
  famiglia: {
    id: string
    nome: string | null
    cognome: string | null
    email: string | null
    telefono: string | null
  } | null
  indirizzo: Record<string, unknown> | null
}

export type RicercaBoardRpcResponse = {
  processes?: RicercaBoardRpcProcess[]
  deferredCounts?: Record<string, number>
}

export type RicercaWorkerSchedaResult = {
  worker: Record<string, unknown> | null
  indirizzi: Record<string, unknown>[]
  esperienze: Record<string, unknown>[]
  documenti: Record<string, unknown>[]
  referenze: Record<string, unknown>[]
  selezione: Record<string, unknown> | null
}
