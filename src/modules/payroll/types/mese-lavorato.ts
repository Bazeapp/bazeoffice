type JsonObject = Record<string, unknown>

export type MeseLavoratoRecord = {
  id: string
  caso_particolare: string | null
  cedolino: JsonObject | JsonObject[] | null
  cedolino_corretto: boolean | null
  cedolino_url: string | null
  check_reminder_pagamento_inviato: boolean | null
  data_invio_famiglia: string | null
  data_ora_creazione: string | null
  importo_busta_estratto: number | null
  importo_sconto_mese: number | null
  mese_id: string | null
  note: string | null
  presenze_id: string | null
  presenze_regolare_id: string | null
  rapporto_lavorativo_id: string | null
  rating_feedback_famiglia: number | null
  stato_mese_lavorativo: string | null
  testo_feedback_famiglia: string | null
  ticket_id: string | null
  ultimo_invio_calendario_presenze: string | null
  airtable_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
