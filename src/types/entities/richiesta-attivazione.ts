type JsonObject = Record<string, unknown>

export type RichiestaAttivazioneRecord = {
  id: string
  data_submission: JsonObject | null
  document_id: string | null
  email: string | null
  fee_concordata: number | null
  firmatario: string | null
  processo_res_id: string | null
  signed_document_id: string | null
  signed_document_title: string | null
  signed_document_url: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
