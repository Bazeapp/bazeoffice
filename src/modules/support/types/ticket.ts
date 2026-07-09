type JsonObject = Record<string, unknown>

export type TicketRecord = {
  id: string
  allegati: JsonObject | JsonObject[] | null
  assunzione_id: string | null
  causale: string | null
  cedolino_id: string | null
  chiusura_id: string | null
  contributi_id: string | null
  created_by: string | null
  data_apertura: string | null
  pagamenti_id: string | null
  presenze_id: string | null
  rapporto_id: string | null
  stato: string | null
  tipo: string | null
  urgenza: string | null
  variazione_id: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
