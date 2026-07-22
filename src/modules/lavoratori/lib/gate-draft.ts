import {
  asInputValue,
  asString,
} from "./base-utils";
import type { LavoratoreRecord } from "../types/lavoratore";

export type GateDraft = {
  referenteIdoneita: string;
  referenteCertificazione: string;
  descrizionePubblica: string;
  livelloItaliano: string;
  ratingAtteggiamento: string;
  ratingCuraPersonale: string;
  ratingPrecisionePuntualita: string;
  ratingCapacitaComunicative: string;
  ratingCorporatura: string;
  checkAccettaFunzionamentoBaze: string;
  checkAccettaPaga9EuroNetti: string;
  pagaOrariaRichiesta: string;
  checkAccettaMultipliContratti: string;
  dataScadenzaNaspi: string;
  assessmentStatus: string;
  assessmentFeedback: string;
};

export const EMPTY_GATE_DRAFT: GateDraft = {
  referenteIdoneita: "",
  referenteCertificazione: "",
  descrizionePubblica: "",
  livelloItaliano: "",
  ratingAtteggiamento: "",
  ratingCuraPersonale: "",
  ratingPrecisionePuntualita: "",
  ratingCapacitaComunicative: "",
  ratingCorporatura: "",
  checkAccettaFunzionamentoBaze: "",
  checkAccettaPaga9EuroNetti: "",
  pagaOrariaRichiesta: "",
  checkAccettaMultipliContratti: "",
  dataScadenzaNaspi: "",
  assessmentStatus: "",
  assessmentFeedback: "",
};

export function buildGateDraftSnapshot(
  selectedWorkerRow: LavoratoreRecord | null,
): GateDraft {
  return {
    referenteIdoneita: asString(selectedWorkerRow?.referente_idoneita_id),
    referenteCertificazione: asString(
      selectedWorkerRow?.referente_certificazione_id,
    ),
    descrizionePubblica: asString(selectedWorkerRow?.descrizione_pubblica),
    livelloItaliano: asString(selectedWorkerRow?.livello_italiano),
    ratingAtteggiamento: asInputValue(selectedWorkerRow?.rating_atteggiamento),
    ratingCuraPersonale: asInputValue(selectedWorkerRow?.rating_cura_personale),
    ratingPrecisionePuntualita: asInputValue(
      selectedWorkerRow?.rating_precisione_puntualita,
    ),
    ratingCapacitaComunicative: asInputValue(
      selectedWorkerRow?.rating_capacita_comunicative,
    ),
    ratingCorporatura: asString(selectedWorkerRow?.rating_corporatura),
    checkAccettaFunzionamentoBaze: asString(
      selectedWorkerRow?.check_accetta_funzionamento_baze,
    ),
    checkAccettaPaga9EuroNetti: asString(
      selectedWorkerRow?.check_accetta_paga_9_euro_netti,
    ),
    pagaOrariaRichiesta: asInputValue(selectedWorkerRow?.paga_oraria_richiesta),
    checkAccettaMultipliContratti: asString(
      selectedWorkerRow?.check_accetta_multipli_contratti,
    ),
    dataScadenzaNaspi: asString(selectedWorkerRow?.data_scadenza_naspi),
    assessmentStatus: asString(selectedWorkerRow?.stato_lavoratore),
    assessmentFeedback: asString(selectedWorkerRow?.feedback_recruiter),
  };
}

export function mergeGateDraftFromSnapshot(
  current: GateDraft,
  previousSynced: GateDraft,
  nextSnapshot: GateDraft,
): GateDraft {
  let changed = false;
  const merged: GateDraft = { ...current };
  (Object.keys(nextSnapshot) as Array<keyof GateDraft>).forEach((key) => {
    const previousValue = previousSynced[key];
    const nextValue = nextSnapshot[key];
    if (previousValue === nextValue) return;
    if (current[key] !== previousValue) {
      return;
    }
    merged[key] = nextValue;
    changed = true;
  });
  return changed ? merged : current;
}
