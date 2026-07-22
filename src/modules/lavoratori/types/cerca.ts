// Form drafts for lavoratori-cerca non-qualificato and lead detail blocks.

export type NonQualificatoFormDraft = {
  descrizione_pubblica: string
  provincia: string
  documenti_in_regola: string
  hai_referenze: string
  data_di_nascita: string
  tipo_lavoro_domestico: string[]
  anni_esperienza_colf: string
  anni_esperienza_babysitter: string
}

export type LeadDetailFormDraft = {
  data_ritorno_disponibilita: string
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
  data_scadenza_naspi: string
  iban: string
  id_stripe_account: string
  riassunto_profilo_breve: string
}
