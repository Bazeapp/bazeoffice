import {
  buildAvailabilityMatrixDraft,
  parseAvailabilityPayload,
} from "./availability-utils"
import { asInputValue, asString, readArrayStrings } from "./base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

export type WorkerAddressDraft = {
  via: string
  civico: string
  cap: string
  citta: string
  provincia: string
  citofono: string
  come_ti_sposti: string[]
}

export type WorkerAvailabilityDraft = {
  vincoli_orari_disponibilita: string
  disponibilita_nel_giorno: string[]
  matrix: ReturnType<typeof buildAvailabilityMatrixDraft>
}

export type WorkerAvailabilityStatusDraft = {
  disponibilita: string
  data_ritorno_disponibilita: string
}

export type WorkerJobSearchDraft = {
  tipo_lavoro_domestico: string[]
  tipo_rapporto_lavorativo: string[]
  check_lavori_accettabili: string[]
  check_accetta_funzionamento_baze: string
  check_accetta_lavori_con_trasferta: string
  check_accetta_multipli_contratti: string
  check_accetta_paga_9_euro_netti: string
}

export type WorkerExperienceDraft = {
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
}

export type WorkerSkillsDraft = {
  livello_pulizie: string
  check_accetta_salire_scale_o_soffitti_alti: string
  compatibilita_famiglie_numerose: string
  compatibilita_famiglie_molto_esigenti: string
  compatibilita_lavoro_con_datore_presente_in_casa: string
  compatibilita_con_case_di_grandi_dimensioni: string
  compatibilita_con_elevata_autonomia_richiesta: string
  compatibilita_con_contesti_pacati: string
  livello_stiro: string
  compatibilita_con_stiro_esigente: string
  livello_cucina: string
  compatibilita_con_cucina_strutturata: string
  livello_babysitting: string
  check_accetta_babysitting_multipli_bambini: string
  check_accetta_babysitting_neonati: string
  compatibilita_babysitting_neonati: string
  livello_dogsitting: string
  check_accetta_case_con_cani: string
  check_accetta_case_con_cani_grandi: string
  check_accetta_case_con_gatti: string
  compatibilita_con_animali_in_casa: string
  livello_giardinaggio: string
  livello_italiano: string
  livello_inglese: string
}

export type WorkerDocumentsDraft = {
  stato_verifica_documenti: string
  documenti_in_regola: string
  data_scadenza_naspi: string
  iban: string
  id_stripe_account: string
}

export type PatchLoadingKey =
  | "nonIdoneo"
  | "nonQualificato"
  | "availability"
  | "availabilityStatus"
  | "jobSearch"
  | "experience"
  | "skills"
  | "documents"

export function buildAddressDraft(
  row: LavoratoreRecord | null,
  address?: Record<string, unknown> | null
): WorkerAddressDraft {
  return {
    via: asString(address?.via),
    civico: asString(address?.civico),
    cap: asString(address?.cap),
    citta: asString(address?.citta),
    provincia: asString(address?.provincia_sigla),
    citofono: asString(address?.citofono),
    come_ti_sposti: readArrayStrings(row?.come_ti_sposti),
  }
}

export function buildAvailabilityDraft(
  row: LavoratoreRecord | null,
  availabilityPayload: ReturnType<typeof parseAvailabilityPayload>
): WorkerAvailabilityDraft {
  return {
    vincoli_orari_disponibilita: asString(row?.vincoli_orari_disponibilita),
    disponibilita_nel_giorno: readArrayStrings(row?.disponibilita_nel_giorno),
    matrix: buildAvailabilityMatrixDraft(row, availabilityPayload),
  }
}

export function buildAvailabilityStatusDraft(
  row: LavoratoreRecord | null
): WorkerAvailabilityStatusDraft {
  return {
    disponibilita: asString(row?.disponibilita),
    data_ritorno_disponibilita: asString(row?.data_ritorno_disponibilita),
  }
}

export function buildJobSearchDraft(row: LavoratoreRecord | null): WorkerJobSearchDraft {
  return {
    tipo_lavoro_domestico: readArrayStrings(row?.tipo_lavoro_domestico),
    tipo_rapporto_lavorativo: readArrayStrings(row?.tipo_rapporto_lavorativo),
    check_lavori_accettabili: readArrayStrings(row?.check_lavori_accettabili),
    check_accetta_funzionamento_baze: asString(row?.check_accetta_funzionamento_baze),
    check_accetta_lavori_con_trasferta: asString(row?.check_accetta_lavori_con_trasferta),
    check_accetta_multipli_contratti: asString(row?.check_accetta_multipli_contratti),
    check_accetta_paga_9_euro_netti: asString(row?.check_accetta_paga_9_euro_netti),
  }
}

export function buildExperienceDraft(row: LavoratoreRecord | null): WorkerExperienceDraft {
  return {
    anni_esperienza_colf: asInputValue(row?.anni_esperienza_colf),
    anni_esperienza_badante: asInputValue(row?.anni_esperienza_badante),
    anni_esperienza_babysitter: asInputValue(row?.anni_esperienza_babysitter),
    situazione_lavorativa_attuale: asString(row?.situazione_lavorativa_attuale),
  }
}

export function buildSkillsDraft(row: LavoratoreRecord | null): WorkerSkillsDraft {
  return {
    livello_pulizie: asString(row?.livello_pulizie),
    check_accetta_salire_scale_o_soffitti_alti: asString(
      row?.check_accetta_salire_scale_o_soffitti_alti
    ),
    compatibilita_famiglie_numerose: asString(row?.compatibilita_famiglie_numerose),
    compatibilita_famiglie_molto_esigenti: asString(
      row?.compatibilita_famiglie_molto_esigenti
    ),
    compatibilita_lavoro_con_datore_presente_in_casa: asString(
      row?.compatibilita_lavoro_con_datore_presente_in_casa
    ),
    compatibilita_con_case_di_grandi_dimensioni: asString(
      row?.compatibilita_con_case_di_grandi_dimensioni
    ),
    compatibilita_con_elevata_autonomia_richiesta: asString(
      row?.compatibilita_con_elevata_autonomia_richiesta
    ),
    compatibilita_con_contesti_pacati: asString(row?.compatibilita_con_contesti_pacati),
    livello_stiro: asString(row?.livello_stiro),
    compatibilita_con_stiro_esigente: asString(row?.compatibilita_con_stiro_esigente),
    livello_cucina: asString(row?.livello_cucina),
    compatibilita_con_cucina_strutturata: asString(
      row?.compatibilita_con_cucina_strutturata
    ),
    livello_babysitting: asString(row?.livello_babysitting),
    check_accetta_babysitting_multipli_bambini: asString(
      row?.check_accetta_babysitting_multipli_bambini
    ),
    check_accetta_babysitting_neonati: asString(row?.check_accetta_babysitting_neonati),
    compatibilita_babysitting_neonati: asString(row?.compatibilita_babysitting_neonati),
    livello_dogsitting: asString(row?.livello_dogsitting),
    check_accetta_case_con_cani: asString(row?.check_accetta_case_con_cani),
    check_accetta_case_con_cani_grandi: asString(row?.check_accetta_case_con_cani_grandi),
    check_accetta_case_con_gatti: asString(row?.check_accetta_case_con_gatti),
    compatibilita_con_animali_in_casa: asString(row?.compatibilita_con_animali_in_casa),
    livello_giardinaggio: asString(row?.livello_giardinaggio),
    livello_italiano: asString(row?.livello_italiano),
    livello_inglese: asString(row?.livello_inglese),
  }
}

export function buildDocumentsDraft(row: LavoratoreRecord | null): WorkerDocumentsDraft {
  return {
    stato_verifica_documenti: asString(row?.stato_verifica_documenti),
    documenti_in_regola: asString(row?.documenti_in_regola),
    data_scadenza_naspi: asString(row?.data_scadenza_naspi),
    iban: asString(row?.iban),
    id_stripe_account: asString(row?.id_stripe_account),
  }
}
