type JsonObject = Record<string, unknown>

export type TransazioneFinanziariaRecord = {
  id: string
  data_ora_creazione: string | null
  id_stripe_checkout_session: string | null
  link_pagamento: string | null
  link_pagamento_short: string | null
  mese_lavorativo_id: string | null
  url_ricevuta_pagamento: string | null
  stato_pagamento: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
