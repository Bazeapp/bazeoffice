type JsonObject = Record<string, unknown>

export type FamigliaRecord = {
  id: string
  arr_from_abbonamenti: string | null
  base_codice_otp: string | null
  call_utm_source: string | null
  codice_fiscale: string | null
  cognome: string | null
  cognome_fatturazione: string | null
  consenso_newsletter: boolean | null
  created_by: JsonObject | null
  customer_email: string | null
  data_call_prenotata: string | null
  data_ora_di_creazione: string | null
  data_ultima_modifica: string | null
  email: string | null
  famiglie_consulenza: string | null
  fatturare_come_azienda: boolean | null
  feedback_customer_interview: string | null
  feedback_richiesto: boolean | null
  is_sent_whatsapp_sales: boolean | null
  lavoratore_match: string | null
  log_sales: string | null
  match_data: string | null
  nome: string | null
  nome_azienda: string | null
  nome_fatturazione: string | null
  partita_iva: string | null
  preventivi: string | null
  quanto_ci_consiglieresti: number | null
  quanto_ci_consiglieresti_scritto: string | null
  quanto_soddisfatto: number | null
  quanto_soddisfatto_scritto: string | null
  rapporti_lavorativi: string | null
  rapporti_lavorativi_2: string | null
  recensione_pubblica: string | null
  referral_richiedere: boolean | null
  referral_stato_richiesta: string | null
  referrer: string | null
  secondary_email: string | null
  stato_richiesta_dati_fatturazione: string | null
  telefono: string | null
  verified_user_wized: boolean | null
  whatsapp: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}

export type FamilyRow = FamigliaRecord
