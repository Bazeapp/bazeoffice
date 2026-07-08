import type { TableColumnMeta } from "@/lib/table-query"

const WORKER_FILTER_FIELD_NAMES = [
  "id", "anni_esperienza_babysitter", "anni_esperienza_badante", "anni_esperienza_colf",
  "check_accetta_babysitting_multipli_bambini", "check_accetta_babysitting_neonati",
  "check_accetta_case_con_cani", "check_accetta_case_con_cani_grandi", "check_accetta_case_con_gatti",
  "check_accetta_funzionamento_baze", "check_accetta_lavori_con_trasferta",
  "check_accetta_multipli_contratti", "check_accetta_paga_9_euro_netti",
  "check_accetta_salire_scale_o_soffitti_alti", "check_blacklist", "check_lavori_accettabili",
  "nome", "cognome", "come_ti_sposti",
  "compatibilita_babysitting_neonati", "compatibilita_con_animali_in_casa",
  "compatibilita_con_case_di_grandi_dimensioni", "compatibilita_con_contesti_pacati",
  "compatibilita_con_cucina_strutturata", "compatibilita_con_elevata_autonomia_richiesta",
  "compatibilita_con_stiro_esigente", "compatibilita_famiglie_molto_esigenti",
  "compatibilita_famiglie_numerose", "compatibilita_lavoro_con_datore_presente_in_casa",
  "conoscenza_dellitaliano", "data_di_nascita",
  "data_ritorno_disponibilita", "data_scadenza_naspi", "data_ultima_candidatura",
  "descrizione_pubblica", "descrizione_rivista",
  "disponibilita", "availability_final_json", "disponibilita_nel_giorno",
  "disponibilita_domenica_mattina", "disponibilita_domenica_pomeriggio", "disponibilita_domenica_sera",
  "disponibilita_giovedi_mattina", "disponibilita_giovedi_pomeriggio", "disponibilita_giovedi_sera",
  "disponibilita_lunedi_mattina", "disponibilita_lunedi_pomeriggio", "disponibilita_lunedi_sera",
  "disponibilita_martedi_mattina", "disponibilita_martedi_pomeriggio", "disponibilita_martedi_sera",
  "disponibilita_mercoledi_mattina", "disponibilita_mercoledi_pomeriggio", "disponibilita_mercoledi_sera",
  "disponibilita_sabato_mattina", "disponibilita_sabato_pomeriggio", "disponibilita_sabato_sera",
  "disponibilita_venerdi_mattina", "disponibilita_venerdi_pomeriggio", "disponibilita_venerdi_sera",
  "documenti_in_regola", "email", "fbclid", "feedback_recruiter", "followup_chiamata_idoneita",
  "foto", "gclid", "hai_referenze", "iban", "id_stripe_account", "livello_babysitting",
  "livello_cucina", "livello_dogsitting", "livello_giardinaggio", "livello_inglese",
  "livello_italiano", "livello_pulizie", "livello_stiro", "motivazione_non_idoneo", "nazionalita",
  "paga_oraria_richiesta", "provincia", "rating_atteggiamento", "rating_capacita_comunicative",
  "rating_corporatura", "rating_cura_personale", "rating_precisione_puntualita",
  "referente_certificazione_id", "referente_idoneita_id", "riassunto_profilo_breve", "sesso",
  "situazione_lavorativa_attuale", "stato_lavoratore",
  "stato_verifica_documenti", "telefono", "tipo_lavoro_domestico", "tipo_rapporto_lavorativo",
  "ultima_modifica", "utm_campaign", "utm_content", "utm_medium",
  "utm_source", "utm_term", "vincoli_orari_disponibilita", "creato_il", "aggiornato_il",
]

function inferWorkerFilterType(name: string): TableColumnMeta["filterType"] {
  if (name === "id") return "id"
  const n = name.trim().toLowerCase()
  if (n.startsWith("anni_")) return "number"
  const dateLike =
    !n.endsWith("_id") &&
    (n.startsWith("data_") ||
      n.includes("deadline") ||
      n.includes("scadenza") ||
      n === "creata" ||
      n === "creato_il" ||
      n === "aggiornato_il")
  return dateLike ? "date" : "text"
}

export const WORKER_SCHEMA_COLUMNS: TableColumnMeta[] = WORKER_FILTER_FIELD_NAMES.map((name) => {
  const filterType = inferWorkerFilterType(name)
  return {
    name,
    filterType,
    dataType:
      filterType === "id" ? "uuid" : filterType === "date" ? "timestamp with time zone" : "text",
    udtName: filterType === "id" ? "uuid" : filterType === "date" ? "timestamptz" : null,
  }
})
