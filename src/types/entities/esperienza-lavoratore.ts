export type EsperienzaLavoratoreRecord = {
  id: string
  lavoratore_id: string | null
  tipo_lavoro: string[] | null
  tipo_rapporto: string | null
  descrizione: string | null
  descrizione_contesto_lavorativo: string | null
  motivazione_fine_rapporto: string | null
  stato_esperienza_attiva: boolean | null
  data_inizio: string | null
  data_fine: string | null
}
