type JsonObject = Record<string, unknown>

export type TransazioneFinanziariaRecord = {
  id: string
  id_stripe_checkout_session: string | null
  mese_lavorativo_id: string | null
  stato_pagamento: string | null
  airtable_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
