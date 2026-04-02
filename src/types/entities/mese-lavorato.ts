type JsonObject = Record<string, unknown>

export type MeseLavoratoRecord = {
  id: string
  ai_assist: string | null
  caso_particolare: string | null
  cedolino: JsonObject | JsonObject[] | null
  cedolino_corretto: boolean | null
  cedolino_url: string | null
  checkbox_trustpilot_temp: boolean | null
  data_invio_famiglia: string | null
  data_ora_creazione: string | null
  estrazione_corretta: boolean | null
  importo_busta_estratto: number | null
  mese_id: string | null
  note: string | null
  opzione_licenziamento: boolean | null
  ore_contratto_mese: number | null
  ore_lavorate_estratte: number | null
  presenze_id: string | null
  presenze_inserite_da_baze: boolean | null
  presenze_regolare_id: string | null
  rapporto_lavorativo_id: string | null
  rating_feedback_famiglia: number | null
  stato_gestione_safacli_old: string | null
  stato_mese_lavorativo: string | null
  temp_reminder_pagamento: boolean | null
  testo_feedback_famiglia: string | null
  ticket_id: string | null
  ultimo_invio_calendario_presenze: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
