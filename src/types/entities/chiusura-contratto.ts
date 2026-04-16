type JsonObject = Record<string, unknown>

export type ChiusuraContrattoRecord = {
  id: string
  allegato_compilato: JsonObject | null
  check_8_giorni_di_lavoro_svolti: string | null
  check_chiusura_istantanea: string | null
  cognome: string | null
  data_creazione: string | null
  data_fine_rapporto: string | null
  documenti_chiusura_rapporto: JsonObject | null
  email: string | null
  informazioni_aggiuntive: string | null
  motivazione_cessazione_rapporto: string | null
  nome: string | null
  presenze_ultimo_mese: string | null
  stato: string | null
  ticket_id: string | null
  tipo_decesso: string | null
  tipo_licenziamento: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
