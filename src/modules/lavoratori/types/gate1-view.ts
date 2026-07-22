import type * as React from "react";

export type GateTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// FASE 5 BIS — campi di dettaglio di gate1 (autosave via useController).
// data_scadenza_naspi ha due chiavi distinte: _worker (lavoratori) e _doc
// (documento), instradate a patch diverse.
export type GateFieldsFormDraft = {
  anni_esperienza_colf: string;
  anni_esperienza_badante: string;
  anni_esperienza_babysitter: string;
  data_ritorno_disponibilita: string;
  descrizione_pubblica: string;
  paga_oraria_richiesta: string;
  data_scadenza_naspi_worker: string;
  data_scadenza_naspi_doc: string;
  iban: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  data_di_nascita: string;
  disponibilita_nel_giorno: string[];
  tipo_rapporto_lavorativo: string[];
  check_lavori_accettabili: string[];
  check_accetta_funzionamento_baze: string;
  check_accetta_paga_9_euro_netti: string;
  check_accetta_multipli_contratti: string;
  come_ti_sposti: string[];
  check_accetta_babysitting_neonati: string;
  check_accetta_babysitting_multipli_bambini: string;
  check_accetta_case_con_cani: string;
  check_accetta_case_con_cani_grandi: string;
  check_accetta_case_con_gatti: string;
  check_accetta_salire_scale_o_soffitti_alti: string;
  check_accetta_lavori_con_trasferta: string;
  referente_idoneita_id: string;
  referente_certificazione_id: string;
  disponibilita: string;
  livello_italiano: string;
  livello_inglese: string;
  livello_cucina: string;
  livello_stiro: string;
  livello_pulizie: string;
  livello_babysitting: string;
  livello_dogsitting: string;
  livello_giardinaggio: string;
  compatibilita_con_stiro_esigente: string;
  compatibilita_con_cucina_strutturata: string;
  compatibilita_babysitting_neonati: string;
  compatibilita_famiglie_numerose: string;
  compatibilita_famiglie_molto_esigenti: string;
  compatibilita_lavoro_con_datore_presente_in_casa: string;
  compatibilita_con_case_di_grandi_dimensioni: string;
  compatibilita_con_animali_in_casa: string;
  compatibilita_con_elevata_autonomia_richiesta: string;
  compatibilita_con_contesti_pacati: string;
  rating_atteggiamento: string;
  rating_cura_personale: string;
  rating_precisione_puntualita: string;
  rating_capacita_comunicative: string;
  rating_corporatura: string;
  tipo_lavoro_domestico: string[];
  hai_referenze: string;
  sesso: string;
  nazionalita: string;
  vincoli_orari_disponibilita: string;
  followup_chiamata_idoneita: string;
  documenti_in_regola: string;
  via: string;
  civico: string;
  cap: string;
  citta: string;
  provincia: string;
  citofono: string;
  stato_lavoratore: string;
  motivazione_non_idoneo: string;
  stato_verifica_documenti: string;
};

export type GateSectionId =
  | "referente"
  | "contatti"
  | "presentazione"
  | "indirizzo"
  | "documenti"
  | "tipologia"
  | "disponibilita"
  | "check_baze"
  | "aspetti"
  | "assessment";

export type GateStepInfo = {
  title: React.ReactNode;
  content: React.ReactNode;
};

export type GateViewProps = {
  gateLabel?: string;
  workerStatus?: string | string[];
  workerCountLabel?: string;
  listControlsSlot?: React.ReactNode;
  showFollowup?: boolean;
  showSelfCertification?: boolean;
  showReferencesInWorkTypes?: boolean;
  showAdministrativeFields?: boolean;
  showStepper?: boolean;
  splitBazeChecksStep?: boolean;
  stepInfoBySection?: Partial<Record<GateSectionId, GateStepInfo>>;
  presentationEditMode?: "always" | "toggle";
  photoEditMode?: "hidden" | "editable";
  addressEditMode?: "always" | "toggle";
  workTypesEditMode?: "always" | "toggle";
  availabilityEditMode?: "always" | "toggle";
  bazeChecksEditMode?: "always" | "toggle";
  documentSectionMode?: "self_certification" | "documents" | "hidden";
  showAssessment?: boolean;
  specificChecksMode?: "gate1" | "confirmation";
  specificChecksEditMode?: "always" | "toggle";
  applyGate1BaseFilters?: boolean;
  showCertificationReferente?: boolean;
  showFollowupFilter?: boolean;
  allowCertifiedStatus?: boolean;
  showInPersonBookingLinks?: boolean;
  stepLayout?: "default" | "gate1_reordered";
};
