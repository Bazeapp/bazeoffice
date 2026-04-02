type JsonObject = Record<string, unknown>

export type RapportoLavorativoRecord = {
  id: string
  accordo_di_lavoro_allegati: JsonObject | JsonObject[] | null
  codice_datore_webcolf: number | null
  codice_dipendente_webcolf: number | null
  cognome_nome_datore_proper: string | null
  creata: string | null
  data_inizio_rapporto: string | null
  dichiarazione_ospitalita_allegati: JsonObject | JsonObject[] | null
  distribuzione_ore_settimana: string | null
  famiglia_id: string | null
  fine_rapporto_lavorativo_id: string | null
  id_rapporto: string | null
  lavoratore_id: string | null
  nome_lavoratore_per_url: string | null
  numero_rapporto_attivato_con_baze: number | null
  ore_a_settimana: number | null
  paga_mensile_lorda: number | null
  paga_oraria_lorda: number | null
  preventivo_id: string | null
  processo_res: string[] | null
  relazione_lavorativa: string | null
  request_lavoratore_referenza: string | null
  request_trustpilot_review: boolean | null
  ricevuta_inps_allegati: JsonObject | JsonObject[] | null
  richiedere_trustpilot_temp: boolean | null
  stato_assunzione: string | null
  stato_rapporto: string | null
  stato_riattivazione: string | null
  stato_servizio: string | null
  temp_check_errore_email: boolean | null
  ticket_id: string | null
  tipo_contratto: string | null
  tipo_contratto_durata: string | null
  tipo_rapporto: string | null
  ultimo_aggiornamento: string | null
  webcolf: boolean | null
  airtable_id: string | null
  airtable_record_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
