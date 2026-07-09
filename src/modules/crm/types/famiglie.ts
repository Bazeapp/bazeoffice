type JsonObject = Record<string, unknown>

export type FamigliaRecord = {
  id: string
  call_utm_source: string | null
  codice_fiscale: string | null
  cognome: string | null
  cognome_fatturazione: string | null
  consenso_newsletter: boolean | null
  customer_email: string | null
  data_call_prenotata: string | null
  email: string | null
  fatturare_come_azienda: boolean | null
  nome: string | null
  nome_azienda: string | null
  nome_fatturazione: string | null
  partita_iva: string | null
  referrer: string | null
  secondary_email: string | null
  stato_richiesta_dati_fatturazione: string | null
  telefono: string | null
  whatsapp: string | null
  airtable_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}

export type FamilyRow = FamigliaRecord
