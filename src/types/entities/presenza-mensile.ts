type JsonObject = Record<string, unknown>

type DailyFieldValue = string | number | null | undefined

export type PresenzaMensileRecord = {
  id: string
  presenze_mensili: number | null
  data_ora_creazione: string | null
  note_interne: string | null
  ticket_id: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
} & {
  [key: `tipo_day_${number}`]: DailyFieldValue
  [key: `ore_day_${number}`]: DailyFieldValue
  [key: `evento_day_${number}`]: DailyFieldValue
  [key: `note_day_${number}`]: DailyFieldValue
  [key: `codice_malattia_day_${number}`]: DailyFieldValue
}
