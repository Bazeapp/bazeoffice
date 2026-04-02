export type MeseCalendarioRecord = {
  id: string
  data_fine: string | null
  data_inizio: string | null
  fine_contributi_inps: string | null
  inizio_contributi_inps: string | null
  json_giorni_festivi: string | null
  mese_lavorativo_copy: string | null
  trimestre_id: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: Record<string, unknown> | null
  numeri_giorni_non_lavorativi: string | null
}
