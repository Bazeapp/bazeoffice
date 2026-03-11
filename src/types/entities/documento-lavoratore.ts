type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

export type DocumentoLavoratoreRecord = {
  id: string
  lavoratore_id: string | null
  tipo_documento: string | null
  stato_documento: string | null
  status: string | null
  data_scadenza: string | null
  data_scadenza_permesso_di_soggiorno: string | null
  allegato_codice_fiscale_fronte: JsonValue | null
  allegato_codice_fiscale_retro: JsonValue | null
  allegato_documento_identita_fronte: JsonValue | null
  allegato_documento_identita_retro: JsonValue | null
  allegato_permesso_di_soggiorno_fronte: JsonValue | null
  allegato_permesso_di_soggiorno_retro: JsonValue | null
  allegato_ricevuta_rinnovo_permesso: JsonValue | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
}
