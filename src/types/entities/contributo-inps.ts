type JsonObject = Record<string, unknown>

export type ContributoInpsRecord = {
  id: string
  allegato: JsonObject | JsonObject[] | null
  data_invio_famiglia: string | null
  data_ora_creazione: string | null
  importo_contributi_inps: number | null
  rapporto_lavorativo_id: string | null
  stato_contributi_inps: string | null
  temp_richiedere_trustpilot: boolean | null
  ticket_id: string | null
  trimestre_id: string | null
  valore_pagopa: number | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
