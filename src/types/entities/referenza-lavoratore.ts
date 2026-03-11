export type ReferenzaLavoratoreRecord = {
  id: string
  esperienza_lavoratore_id: string | null
  lavoratore_id: string | null
  referenza_verificata: string | null
  referenza_verificata_da_baze: boolean | null
  nome_datore: string | null
  cognome_datore: string | null
  telefono_datore: string | null
  valutazione: number | null
  data_inzio: string | null
  data_fine: string | null
  rapporto_ancora_attivo: boolean | null
  commento_esperienza: string | null
  assunto_tramite_baze: boolean | null
  ruolo: string[] | null
}
