type JsonObject = Record<string, unknown>

export type RapportoStatusFilter =
  | "all"
  | "In attivazione"
  | "Attivo"
  | "Terminato"
  | "Sconosciuto"
  | "Errore"

export type RapportoLavorativoRecord = {
  id: string
  accordo_di_lavoro_allegati: JsonObject | JsonObject[] | null
  codice_datore_webcolf: number | null
  codice_dipendente_webcolf: number | null
  cognome_nome_datore_proper: string | null
  creata: string | null
  data_inizio_rapporto: string | null
  data_fine_rapporto?: string | null
  dichiarazione_ospitalita_allegati: JsonObject | JsonObject[] | null
  distribuzione_ore_settimana: string | null
  famiglia_id: string | null
  fine_rapporto_lavorativo_id: string | null
  id_rapporto: string | null
  lavoratore_id: string | null
  nome_lavoratore_per_url: string | null
  ore_a_settimana: number | null
  paga_mensile_lorda: number | null
  paga_oraria_lorda: number | null
  processi_matching_id: string | null
  assunzione_datore_id: string | null
  assunzione_lavoratore_id: string | null
  processo_res?: string[] | string | null
  prova_data_checkin: string | null
  prova_feedback_famiglia: string | null
  prova_feedback_lavoratore: string | null
  prova_note_cs_famiglia: string | null
  prova_note_cs_lavoratore: string | null
  prova_priorita_famiglia: string | null
  prova_ramo_d2: string | null
  prova_stato_cs: string | null
  registrazione_chiamate_famiglia: JsonObject | JsonObject[] | null
  registrazione_chiamate_lavoratori: JsonObject | JsonObject[] | null
  relazione_lavorativa: string | null
  ricevuta_inps_allegati: JsonObject | JsonObject[] | null
  richiesta_attivazione_id: string | null
  stato_assunzione: string | null
  stato_rapporto: string | null
  stato_riattivazione: string | null
  stato_servizio: string | null
  ticket_id: string | null
  tipo_contratto: string | null
  tipo_contratto_durata: string | null
  tipo_rapporto: string | null
  airtable_id: string | null
  creato_il: string | null
  aggiornato_il: string | null
  metadati_migrazione: JsonObject | null
}
