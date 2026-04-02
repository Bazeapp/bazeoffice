type JsonObject = Record<string, unknown>

export type VariazioneContrattualeRecord = {
  id: string
  accordo_variazione_contrattuale: JsonObject | null
  data_variazione: string | null
  rapporto_lavorativo_id: string | null
  ricevuta_inps_variazione_rapporto: JsonObject | null
  stato: string | null
  ticket_id: string | null
  variazione_da_applicare: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
