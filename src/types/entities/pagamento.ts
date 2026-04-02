type JsonObject = Record<string, unknown>

export type PagamentoRecord = {
  id: string
  abbonamento_id: string | null
  amount: number | null
  amount_refunded: number | null
  catalogo_prezzi_id: string | null
  charge_id: string | null
  codice_fiscale: string | null
  currency: string | null
  customer_email: string | null
  data_ora_di_pagamento: string | null
  famiglia_id: string | null
  famiglie_consulenza: string | null
  fattura_url: string | null
  fee: number | null
  indirizzo_fatturazione: string | null
  numero_fattura: string | null
  payment_intent_id: string | null
  payment_source: string | null
  status: string | null
  taxes_on_fee: number | null
  temp_fattura_rifatta: boolean | null
  ticket_id: string | null
  transazione_id: string | null
  type_of_payment: string | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
