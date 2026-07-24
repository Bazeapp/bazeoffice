import type * as React from "react";

import {
  asInputValue,
  asString,
  parseNumberValue,
  readArrayStrings,
} from "./base-utils";
import {
  getLookupOptionLabel,
  getLookupSelectValue,
  normalizeLookupOptionValues,
} from "@/lib/lookup-utils";
import type { GateDraft } from "./gate-draft";
import type {
  WorkerAddressDraft,
  WorkerAvailabilityDraft,
  WorkerAvailabilityStatusDraft,
  WorkerDocumentsDraft,
  WorkerJobSearchDraft,
  WorkerSkillsDraft,
} from "./worker-editor-draft-builders";
import type { GateFieldsFormDraft } from "../types/gate1-view";
import type { LavoratoreRecord } from "../types/lavoratore";

function toLookupFormLabel(
  options: Array<{ label: string; value: string }>,
  raw: unknown,
): string {
  const normalized = asString(raw);
  if (!normalized) return "";
  return getLookupOptionLabel(options, normalized) || normalized;
}

const SKILL_PATCH_FIELDS = new Set([
  "livello_inglese",
  "livello_cucina",
  "livello_stiro",
  "livello_pulizie",
  "livello_babysitting",
  "livello_dogsitting",
  "livello_giardinaggio",
  "compatibilita_con_stiro_esigente",
  "compatibilita_con_cucina_strutturata",
  "compatibilita_babysitting_neonati",
  "compatibilita_famiglie_numerose",
  "compatibilita_famiglie_molto_esigenti",
  "compatibilita_lavoro_con_datore_presente_in_casa",
  "compatibilita_con_case_di_grandi_dimensioni",
  "compatibilita_con_animali_in_casa",
  "compatibilita_con_elevata_autonomia_richiesta",
  "compatibilita_con_contesti_pacati",
] as const satisfies ReadonlyArray<keyof GateFieldsFormDraft>);

type LookupOptionsByDomain = Map<string, Array<{ label: string; value: string }>>;

export function buildGateFieldsDefaults({
  selectedWorkerRow,
  selectedWorkerAddress,
  lookupOptionsByDomain,
  resolvedIban,
}: {
  selectedWorkerRow: LavoratoreRecord | null;
  selectedWorkerAddress: Record<string, unknown> | null;
  lookupOptionsByDomain: LookupOptionsByDomain;
  resolvedIban: string;
}): GateFieldsFormDraft {
  return {
    anni_esperienza_colf: asInputValue(selectedWorkerRow?.anni_esperienza_colf),
    anni_esperienza_badante: asInputValue(
      selectedWorkerRow?.anni_esperienza_badante,
    ),
    anni_esperienza_babysitter: asInputValue(
      selectedWorkerRow?.anni_esperienza_babysitter,
    ),
    data_ritorno_disponibilita: asString(
      selectedWorkerRow?.data_ritorno_disponibilita,
    ),
    descrizione_pubblica: asString(selectedWorkerRow?.descrizione_pubblica),
    paga_oraria_richiesta: asInputValue(
      selectedWorkerRow?.paga_oraria_richiesta,
    ),
    data_scadenza_naspi_worker: asString(selectedWorkerRow?.data_scadenza_naspi),
    data_scadenza_naspi_doc: asString(selectedWorkerRow?.data_scadenza_naspi),
    iban: resolvedIban,
    nome: asString(selectedWorkerRow?.nome),
    cognome: asString(selectedWorkerRow?.cognome),
    email: asString(selectedWorkerRow?.email),
    telefono: asString(selectedWorkerRow?.telefono),
    data_di_nascita: asString(selectedWorkerRow?.data_di_nascita),
    disponibilita_nel_giorno: readArrayStrings(
      selectedWorkerRow?.disponibilita_nel_giorno,
    ),
    tipo_rapporto_lavorativo: readArrayStrings(
      selectedWorkerRow?.tipo_rapporto_lavorativo,
    ),
    check_lavori_accettabili: readArrayStrings(
      selectedWorkerRow?.check_lavori_accettabili,
    ),
    check_accetta_funzionamento_baze: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.check_accetta_funzionamento_baze") ??
        [],
      selectedWorkerRow?.check_accetta_funzionamento_baze,
    ),
    check_accetta_paga_9_euro_netti: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_paga_9_euro_netti",
      ) ?? [],
      selectedWorkerRow?.check_accetta_paga_9_euro_netti,
    ),
    check_accetta_multipli_contratti: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_multipli_contratti",
      ) ?? [],
      selectedWorkerRow?.check_accetta_multipli_contratti,
    ),
    come_ti_sposti: normalizeLookupOptionValues(
      readArrayStrings(selectedWorkerRow?.come_ti_sposti),
      lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? [],
    ),
    check_accetta_babysitting_neonati: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_neonati",
      ) ?? [],
      selectedWorkerRow?.check_accetta_babysitting_neonati,
    ),
    check_accetta_babysitting_multipli_bambini: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_multipli_bambini",
      ) ?? [],
      selectedWorkerRow?.check_accetta_babysitting_multipli_bambini,
    ),
    check_accetta_case_con_cani: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_cani") ?? [],
      selectedWorkerRow?.check_accetta_case_con_cani,
    ),
    check_accetta_case_con_cani_grandi: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_case_con_cani_grandi",
      ) ?? [],
      selectedWorkerRow?.check_accetta_case_con_cani_grandi,
    ),
    check_accetta_case_con_gatti: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_gatti") ??
        [],
      selectedWorkerRow?.check_accetta_case_con_gatti,
    ),
    check_accetta_salire_scale_o_soffitti_alti: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
      ) ?? [],
      selectedWorkerRow?.check_accetta_salire_scale_o_soffitti_alti,
    ),
    check_accetta_lavori_con_trasferta: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_lavori_con_trasferta",
      ) ?? [],
      selectedWorkerRow?.check_accetta_lavori_con_trasferta,
    ),
    referente_idoneita_id: asString(selectedWorkerRow?.referente_idoneita_id),
    referente_certificazione_id: asString(
      selectedWorkerRow?.referente_certificazione_id,
    ),
    disponibilita: asString(selectedWorkerRow?.disponibilita),
    livello_italiano: asString(selectedWorkerRow?.livello_italiano),
    livello_inglese: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_inglese") ?? [],
      selectedWorkerRow?.livello_inglese,
    ),
    livello_cucina: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_cucina") ?? [],
      selectedWorkerRow?.livello_cucina,
    ),
    livello_stiro: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_stiro") ?? [],
      selectedWorkerRow?.livello_stiro,
    ),
    livello_pulizie: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_pulizie") ?? [],
      selectedWorkerRow?.livello_pulizie,
    ),
    livello_babysitting: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_babysitting") ?? [],
      selectedWorkerRow?.livello_babysitting,
    ),
    livello_dogsitting: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_dogsitting") ?? [],
      selectedWorkerRow?.livello_dogsitting,
    ),
    livello_giardinaggio: toLookupFormLabel(
      lookupOptionsByDomain.get("lavoratori.livello_giardinaggio") ?? [],
      selectedWorkerRow?.livello_giardinaggio,
    ),
    compatibilita_con_stiro_esigente: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_stiro_esigente",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_stiro_esigente,
    ),
    compatibilita_con_cucina_strutturata: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_cucina_strutturata",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_cucina_strutturata,
    ),
    compatibilita_babysitting_neonati: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_babysitting_neonati",
      ) ?? [],
      selectedWorkerRow?.compatibilita_babysitting_neonati,
    ),
    compatibilita_famiglie_numerose: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_famiglie_numerose",
      ) ?? [],
      selectedWorkerRow?.compatibilita_famiglie_numerose,
    ),
    compatibilita_famiglie_molto_esigenti: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_famiglie_molto_esigenti",
      ) ?? [],
      selectedWorkerRow?.compatibilita_famiglie_molto_esigenti,
    ),
    compatibilita_lavoro_con_datore_presente_in_casa: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
      ) ?? [],
      selectedWorkerRow?.compatibilita_lavoro_con_datore_presente_in_casa,
    ),
    compatibilita_con_case_di_grandi_dimensioni: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_case_di_grandi_dimensioni,
    ),
    compatibilita_con_animali_in_casa: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_animali_in_casa",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_animali_in_casa,
    ),
    compatibilita_con_elevata_autonomia_richiesta: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_elevata_autonomia_richiesta,
    ),
    compatibilita_con_contesti_pacati: toLookupFormLabel(
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_contesti_pacati",
      ) ?? [],
      selectedWorkerRow?.compatibilita_con_contesti_pacati,
    ),
    rating_atteggiamento: asInputValue(selectedWorkerRow?.rating_atteggiamento),
    rating_cura_personale: asInputValue(
      selectedWorkerRow?.rating_cura_personale,
    ),
    rating_precisione_puntualita: asInputValue(
      selectedWorkerRow?.rating_precisione_puntualita,
    ),
    rating_capacita_comunicative: asInputValue(
      selectedWorkerRow?.rating_capacita_comunicative,
    ),
    rating_corporatura: asString(selectedWorkerRow?.rating_corporatura),
    tipo_lavoro_domestico: readArrayStrings(
      selectedWorkerRow?.tipo_lavoro_domestico,
    ),
    hai_referenze: asString(selectedWorkerRow?.hai_referenze),
    sesso: asString(selectedWorkerRow?.sesso),
    nazionalita: asString(selectedWorkerRow?.nazionalita),
    vincoli_orari_disponibilita: asString(
      selectedWorkerRow?.vincoli_orari_disponibilita,
    ),
    followup_chiamata_idoneita: asString(
      selectedWorkerRow?.followup_chiamata_idoneita,
    ),
    documenti_in_regola: getLookupSelectValue(
      asString(selectedWorkerRow?.documenti_in_regola),
      lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ?? [],
      "",
    ),
    via: asString(selectedWorkerAddress?.via),
    civico: asString(selectedWorkerAddress?.civico),
    cap: asString(selectedWorkerAddress?.cap),
    citta: asString(selectedWorkerAddress?.citta),
    provincia: asString(selectedWorkerAddress?.provincia_sigla),
    citofono: asString(selectedWorkerAddress?.citofono),
    stato_lavoratore: asString(selectedWorkerRow?.stato_lavoratore),
    motivazione_non_idoneo: asString(
      readArrayStrings(selectedWorkerRow?.motivazione_non_idoneo)[0],
    ),
    stato_verifica_documenti: getLookupSelectValue(
      asString(selectedWorkerRow?.stato_verifica_documenti),
      lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [],
      "",
    ),
  };
}

export type GateFieldsSaveDeps = {
  setAvailabilityDraft: React.Dispatch<
    React.SetStateAction<WorkerAvailabilityDraft>
  >;
  setAddressDraft: React.Dispatch<React.SetStateAction<WorkerAddressDraft>>;
  setJobSearchDraft: React.Dispatch<React.SetStateAction<WorkerJobSearchDraft>>;
  setSkillsDraft: React.Dispatch<React.SetStateAction<WorkerSkillsDraft>>;
  setAvailabilityStatusDraft: React.Dispatch<
    React.SetStateAction<WorkerAvailabilityStatusDraft>
  >;
  setDocumentsDraft: React.Dispatch<React.SetStateAction<WorkerDocumentsDraft>>;
  setGateDraft: React.Dispatch<React.SetStateAction<GateDraft>>;
  patchSelectedWorkerField: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void>;
  patchSkillsField: (
    field: keyof WorkerSkillsDraft,
    value: string,
  ) => Promise<void>;
  patchWorkerAvailabilityStatus: (
    patch: Pick<
      Partial<LavoratoreRecord>,
      "disponibilita" | "data_ritorno_disponibilita"
    >,
  ) => Promise<void>;
  patchDocumentField: (
    field: keyof WorkerDocumentsDraft,
    value: string | null,
  ) => Promise<void>;
  commitAddressField: (
    field:
      | "via"
      | "civico"
      | "cap"
      | "citta"
      | "provincia"
      | "citofono"
      | "come_ti_sposti",
    overrideValue?: string,
  ) => Promise<void>;
  patchWorkerAddressField: (
    field:
      | "via"
      | "civico"
      | "cap"
      | "citta"
      | "provincia"
      | "citofono"
      | "note",
    value: string | null,
  ) => Promise<void>;
};

export function createGateFieldsOnSave(
  deps: GateFieldsSaveDeps,
): (patch: Partial<GateFieldsFormDraft>) => Promise<void> {
  const {
    setAvailabilityDraft,
    setAddressDraft,
    setJobSearchDraft,
    setSkillsDraft,
    setAvailabilityStatusDraft,
    setDocumentsDraft,
    setGateDraft,
    patchSelectedWorkerField,
    patchSkillsField,
    patchWorkerAvailabilityStatus,
    patchDocumentField,
    commitAddressField,
    patchWorkerAddressField,
  } = deps;

  return async (patch) => {
    for (const [key, rawValue] of Object.entries(patch)) {
      if (
        key === "disponibilita_nel_giorno" ||
        key === "tipo_rapporto_lavorativo" ||
        key === "check_lavori_accettabili" ||
        key === "come_ti_sposti" ||
        key === "tipo_lavoro_domestico"
      ) {
        const values = Array.isArray(rawValue) ? rawValue : [];
        if (key === "disponibilita_nel_giorno") {
          setAvailabilityDraft((current) => ({
            ...current,
            disponibilita_nel_giorno: values,
          }));
          await patchSelectedWorkerField(
            "disponibilita_nel_giorno",
            values.length > 0 ? values : null,
          );
        } else if (key === "come_ti_sposti") {
          setAddressDraft((current) => ({
            ...current,
            come_ti_sposti: values,
          }));
          await patchSelectedWorkerField(
            "come_ti_sposti",
            values.length > 0 ? values : null,
          );
        } else if (key === "tipo_lavoro_domestico") {
          setJobSearchDraft((current) => ({
            ...current,
            tipo_lavoro_domestico: values,
          }));
          await patchSelectedWorkerField(
            "tipo_lavoro_domestico",
            values.length > 0 ? values : null,
          );
        } else {
          setJobSearchDraft((current) => ({
            ...current,
            [key]: values,
          }));
          await patchSelectedWorkerField(
            key,
            values.length > 0 ? values : null,
          );
        }
        continue;
      }
      const v = typeof rawValue === "string" ? rawValue : "";
      if (
        SKILL_PATCH_FIELDS.has(
          key as (typeof SKILL_PATCH_FIELDS extends Set<infer T> ? T : never),
        )
      ) {
        setSkillsDraft((current) => ({
          ...current,
          [key]: v,
        }));
        await patchSkillsField(
          key as Parameters<typeof patchSkillsField>[0],
          v,
        );
        continue;
      }
      switch (key) {
        case "anni_esperienza_colf":
          await patchSelectedWorkerField(
            "anni_esperienza_colf",
            v ? Number(v) : null,
          );
          break;
        case "anni_esperienza_badante":
          await patchSelectedWorkerField(
            "anni_esperienza_badante",
            v ? Number(v) : null,
          );
          break;
        case "anni_esperienza_babysitter":
          await patchSelectedWorkerField(
            "anni_esperienza_babysitter",
            v ? Number(v) : null,
          );
          break;
        case "data_ritorno_disponibilita":
          setAvailabilityStatusDraft((current) => ({
            ...current,
            data_ritorno_disponibilita: v,
          }));
          await patchWorkerAvailabilityStatus({
            data_ritorno_disponibilita: v || null,
          });
          break;
        case "disponibilita":
          setAvailabilityStatusDraft((current) => ({
            ...current,
            disponibilita: v,
          }));
          await patchWorkerAvailabilityStatus({
            disponibilita: v || null,
          });
          break;
        case "descrizione_pubblica":
          await patchSelectedWorkerField("descrizione_pubblica", v || null);
          break;
        case "paga_oraria_richiesta":
          setGateDraft((current) => ({
            ...current,
            pagaOrariaRichiesta: v,
          }));
          await patchSelectedWorkerField(
            "paga_oraria_richiesta",
            parseNumberValue(v),
          );
          break;
        case "data_scadenza_naspi_worker":
          setGateDraft((current) => ({
            ...current,
            dataScadenzaNaspi: v,
          }));
          await patchSelectedWorkerField("data_scadenza_naspi", v || null);
          break;
        case "data_scadenza_naspi_doc":
          await patchDocumentField("data_scadenza_naspi", v || null);
          break;
        case "iban":
          await patchDocumentField("iban", v || null);
          break;
        case "nome":
          await patchSelectedWorkerField("nome", v.trim() || null);
          break;
        case "cognome":
          await patchSelectedWorkerField("cognome", v.trim() || null);
          break;
        case "email":
          await patchSelectedWorkerField("email", v.trim() || null);
          break;
        case "telefono":
          await patchSelectedWorkerField("telefono", v.trim() || null);
          break;
        case "data_di_nascita":
          await patchSelectedWorkerField("data_di_nascita", v || null);
          break;
        case "check_accetta_funzionamento_baze":
          setGateDraft((current) => ({
            ...current,
            checkAccettaFunzionamentoBaze: v,
          }));
          await patchSelectedWorkerField(
            "check_accetta_funzionamento_baze",
            v || null,
          );
          break;
        case "check_accetta_paga_9_euro_netti":
          setGateDraft((current) => ({
            ...current,
            checkAccettaPaga9EuroNetti: v,
          }));
          await patchSelectedWorkerField(
            "check_accetta_paga_9_euro_netti",
            v || null,
          );
          break;
        case "check_accetta_multipli_contratti":
          setGateDraft((current) => ({
            ...current,
            checkAccettaMultipliContratti: v,
          }));
          await patchSelectedWorkerField(
            "check_accetta_multipli_contratti",
            v || null,
          );
          break;
        case "check_accetta_babysitting_neonati":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_babysitting_neonati: v,
          }));
          await patchSkillsField("check_accetta_babysitting_neonati", v);
          break;
        case "check_accetta_babysitting_multipli_bambini":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_babysitting_multipli_bambini: v,
          }));
          await patchSkillsField(
            "check_accetta_babysitting_multipli_bambini",
            v,
          );
          break;
        case "check_accetta_case_con_cani":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_case_con_cani: v,
          }));
          await patchSkillsField("check_accetta_case_con_cani", v);
          break;
        case "check_accetta_case_con_cani_grandi":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_case_con_cani_grandi: v,
          }));
          await patchSkillsField("check_accetta_case_con_cani_grandi", v);
          break;
        case "check_accetta_case_con_gatti":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_case_con_gatti: v,
          }));
          await patchSkillsField("check_accetta_case_con_gatti", v);
          break;
        case "check_accetta_salire_scale_o_soffitti_alti":
          setSkillsDraft((current) => ({
            ...current,
            check_accetta_salire_scale_o_soffitti_alti: v,
          }));
          await patchSkillsField(
            "check_accetta_salire_scale_o_soffitti_alti",
            v,
          );
          break;
        case "check_accetta_lavori_con_trasferta":
          setJobSearchDraft((current) => ({
            ...current,
            check_accetta_lavori_con_trasferta: v,
          }));
          await patchSelectedWorkerField(
            "check_accetta_lavori_con_trasferta",
            v || null,
          );
          break;
        case "referente_idoneita_id":
          setGateDraft((current) => ({
            ...current,
            referenteIdoneita: v,
          }));
          await patchSelectedWorkerField("referente_idoneita_id", v || null);
          break;
        case "referente_certificazione_id":
          setGateDraft((current) => ({
            ...current,
            referenteCertificazione: v,
          }));
          await patchSelectedWorkerField(
            "referente_certificazione_id",
            v || null,
          );
          break;
        case "livello_italiano":
          setGateDraft((current) => ({
            ...current,
            livelloItaliano: v,
          }));
          await patchSelectedWorkerField("livello_italiano", v || null);
          break;
        case "rating_atteggiamento":
          setGateDraft((current) => ({
            ...current,
            ratingAtteggiamento: v,
          }));
          await patchSelectedWorkerField(
            "rating_atteggiamento",
            parseNumberValue(v),
          );
          break;
        case "rating_cura_personale":
          setGateDraft((current) => ({
            ...current,
            ratingCuraPersonale: v,
          }));
          await patchSelectedWorkerField(
            "rating_cura_personale",
            parseNumberValue(v),
          );
          break;
        case "rating_precisione_puntualita":
          setGateDraft((current) => ({
            ...current,
            ratingPrecisionePuntualita: v,
          }));
          await patchSelectedWorkerField(
            "rating_precisione_puntualita",
            parseNumberValue(v),
          );
          break;
        case "rating_capacita_comunicative":
          setGateDraft((current) => ({
            ...current,
            ratingCapacitaComunicative: v,
          }));
          await patchSelectedWorkerField(
            "rating_capacita_comunicative",
            parseNumberValue(v),
          );
          break;
        case "rating_corporatura":
          setGateDraft((current) => ({
            ...current,
            ratingCorporatura: v,
          }));
          await patchSelectedWorkerField("rating_corporatura", v || null);
          break;
        case "hai_referenze":
          await patchSelectedWorkerField("hai_referenze", v || null);
          break;
        case "sesso":
          await patchSelectedWorkerField("sesso", v || null);
          break;
        case "nazionalita":
          await patchSelectedWorkerField("nazionalita", v || null);
          break;
        case "vincoli_orari_disponibilita":
          setAvailabilityDraft((current) => ({
            ...current,
            vincoli_orari_disponibilita: v,
          }));
          await patchSelectedWorkerField(
            "vincoli_orari_disponibilita",
            v.trim() || null,
          );
          break;
        case "followup_chiamata_idoneita":
          await patchSelectedWorkerField(
            "followup_chiamata_idoneita",
            v || null,
          );
          break;
        case "documenti_in_regola":
          setDocumentsDraft((current) => ({
            ...current,
            documenti_in_regola: v,
          }));
          await patchDocumentField("documenti_in_regola", v || null);
          break;
        case "via":
        case "civico":
        case "cap":
        case "citta":
        case "citofono": {
          const trimmed = v.trim();
          setAddressDraft((current) => ({ ...current, [key]: v }));
          await commitAddressField(key, trimmed);
          break;
        }
        case "provincia":
          setAddressDraft((current) => ({ ...current, provincia: v }));
          await patchWorkerAddressField("provincia", v || null);
          break;
        case "stato_verifica_documenti":
          setDocumentsDraft((current) => ({
            ...current,
            stato_verifica_documenti: v,
          }));
          await patchDocumentField("stato_verifica_documenti", v || null);
          break;
      }
    }
  };
}
