type JsonObject = Record<string, unknown>

export type RichiestaAttivazioneRecord = {
  id: string
  data_submission: JsonObject | null
  email: string | null
  fee_concordata: number | null
  processo_res_id: string | null
  signed_document_title: string | null
  signed_document_url: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
