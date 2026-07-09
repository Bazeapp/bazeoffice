import * as React from "react";

import { useComboboxAnchor } from "@/components/ui/combobox";
import {
  asInputValue,
  asString,
  parseNumberValue,
  readArrayStrings,
} from "../lib/base-utils";
import { useLavoratoriData } from "./use-lavoratori-data";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { useSelectedWorkerEditor } from "./use-selected-worker-editor";
import { useController } from "react-hook-form";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name";
import {
  getLookupOptionLabel,
  getLookupSelectValue,
  normalizeLookupOptionValues,
} from "../lib/lookup-utils";
import {
  GATE1_IN_PERSON_BOOKING_LINKS,
  includesBabysitterType,
} from "../lib/gate1-utils";
import type { GateFieldsFormDraft, GateViewProps } from "../types/gate1-view";
import { useGate1ListFilters } from "./use-gate1-list-panel";

type ResolvedGateViewProps = Required<
  Pick<
    GateViewProps,
    | "gateLabel"
    | "workerStatus"
    | "workerCountLabel"
    | "showFollowup"
    | "showSelfCertification"
    | "showReferencesInWorkTypes"
    | "showAdministrativeFields"
    | "showStepper"
    | "splitBazeChecksStep"
    | "stepInfoBySection"
    | "presentationEditMode"
    | "photoEditMode"
    | "addressEditMode"
    | "workTypesEditMode"
    | "availabilityEditMode"
    | "bazeChecksEditMode"
    | "showAssessment"
    | "specificChecksMode"
    | "specificChecksEditMode"
    | "applyGate1BaseFilters"
    | "showCertificationReferente"
    | "showFollowupFilter"
    | "allowCertifiedStatus"
    | "showInPersonBookingLinks"
    | "stepLayout"
  >
> &
  Pick<GateViewProps, "listControlsSlot" | "documentSectionMode">;

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

function resolveGateViewProps(props: GateViewProps): ResolvedGateViewProps {
  return {
    gateLabel: props.gateLabel ?? "Gate 1",
    workerStatus: props.workerStatus ?? "qualificato",
    workerCountLabel: props.workerCountLabel ?? "qualificati",
    listControlsSlot: props.listControlsSlot,
    showFollowup: props.showFollowup ?? true,
    showSelfCertification: props.showSelfCertification ?? true,
    showReferencesInWorkTypes: props.showReferencesInWorkTypes ?? false,
    showAdministrativeFields: props.showAdministrativeFields ?? false,
    showStepper: props.showStepper ?? false,
    splitBazeChecksStep: props.splitBazeChecksStep ?? false,
    stepInfoBySection: props.stepInfoBySection ?? {},
    presentationEditMode: props.presentationEditMode ?? "always",
    photoEditMode: props.photoEditMode ?? "hidden",
    addressEditMode: props.addressEditMode ?? "always",
    workTypesEditMode: props.workTypesEditMode ?? "always",
    availabilityEditMode: props.availabilityEditMode ?? "always",
    bazeChecksEditMode: props.bazeChecksEditMode ?? "always",
    documentSectionMode: props.documentSectionMode,
    showAssessment: props.showAssessment ?? true,
    specificChecksMode: props.specificChecksMode ?? "gate1",
    specificChecksEditMode: props.specificChecksEditMode ?? "always",
    applyGate1BaseFilters: props.applyGate1BaseFilters ?? true,
    showCertificationReferente: props.showCertificationReferente ?? false,
    showFollowupFilter: props.showFollowupFilter ?? true,
    allowCertifiedStatus: props.allowCertifiedStatus ?? false,
    showInPersonBookingLinks: props.showInPersonBookingLinks ?? false,
    stepLayout: props.stepLayout ?? "default",
  };
}

export function useGate1View(props: GateViewProps) {
  const {
    gateLabel,
    workerStatus,
    workerCountLabel,
    listControlsSlot,
    showFollowup,
    showSelfCertification,
    showReferencesInWorkTypes,
    showAdministrativeFields,
    showStepper,
    splitBazeChecksStep,
    stepInfoBySection,
    presentationEditMode,
    photoEditMode,
    addressEditMode,
    workTypesEditMode,
    availabilityEditMode,
    bazeChecksEditMode,
    documentSectionMode,
    showAssessment,
    specificChecksMode,
    specificChecksEditMode,
    applyGate1BaseFilters,
    showCertificationReferente,
    showFollowupFilter,
    allowCertifiedStatus,
    showInPersonBookingLinks,
    stepLayout,
  } = resolveGateViewProps(props);

  const {
    gateProvinciaFilter,
    setGateProvinciaFilter,
    gateFollowupFilter,
    setGateFollowupFilter,
  } = useGate1ListFilters();
  const {
    workers,
    workerRows,
    workerAddressesById,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    loading,
    error,
    setError,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    filterFields,
    loadWorkersSchema,
    table,
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    savedViews,
    activeViewId,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  } = useLavoratoriData({
    forcedWorkerStatus: workerStatus,
    applyGate1BaseFilters,
    includeRelatedSelectionDetails: false,
    gate1ProvinciaFilter: gateProvinciaFilter,
    gate1FollowupFilter: gateFollowupFilter,
  });
  const groupingOptions = React.useMemo(
    () =>
      filterFields.map((field) => ({ label: field.label, value: field.value })),
    [filterFields],
  );

  // D2 — cattura l'oggetto editor per il <Gate1WorkerProvider>: le card estratte
  // lo consumeranno via useGate1WorkerEditor() invece del prop-drilling.
  const gate1Editor = useSelectedWorkerEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    lookupColorsByDomain,
    setError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });

  const {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    availabilityPayload,
    disponibilitaBadgeClassName,
    availabilityReadOnlyRows,
    nonIdoneoReasonValues,
    blacklistChecked,
    recruiterFeedbackEntries,
    isEditingHeader,
    setIsEditingHeader,
    isEditingAddress,
    setIsEditingAddress,
    isEditingExperience,
    setIsEditingExperience,
    isEditingSkills,
    setIsEditingSkills,
    isEditingDocuments,
    setIsEditingDocuments,
    selectedPresentationPhotoIndex,
    setSelectedPresentationPhotoIndex,
    addressDraft,
    setAddressDraft,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityStatusDraft,
    setAvailabilityStatusDraft,
    jobSearchDraft,
    setJobSearchDraft,
    experienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    presentationPhotoSlots,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
    updatingNonIdoneo,
    updatingNonQualificato,
    handleNonIdoneoReasonsChange,
    patchSelectedWorkerField,
    patchWorkerAddressField,
    commitAddressField,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
    patchExperienceRecord,
    createExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    patchSkillsField,
    patchDocumentField,
    generateStripeAccount,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  } = gate1Editor;

  const operatorName = useCurrentOperatorName();
  // FASE 5 BIS — tutti i campi di dettaglio di gate1 su un unico form autosave.
  // Le card consumano value/onChange: ogni campo è agganciato via useController,
  // così field.onChange emette un vero evento "change" e l'autosave scatta (a
  // differenza di setValue). Il resync per-worker è dato dal reset keyed-on-
  // signature di useAutoSaveForm (sostituisce il vecchio { identity }). onSave
  // instrada ogni chiave alla STESSA patch fn con le STESSE trasformazioni.
  // Nota: data_scadenza_naspi compare due volte (worker vs document) con due
  // chiavi-form distinte instradate a patch diverse.
  const gateFieldsForm = useAutoSaveForm<GateFieldsFormDraft>({
    defaults: {
      anni_esperienza_colf: asInputValue(
        selectedWorkerRow?.anni_esperienza_colf,
      ),
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
      data_scadenza_naspi_worker: asString(
        selectedWorkerRow?.data_scadenza_naspi,
      ),
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
        lookupOptionsByDomain.get(
          "lavoratori.check_accetta_funzionamento_baze",
        ) ?? [],
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
        lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_cani") ??
          [],
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
      rating_atteggiamento: asInputValue(
        selectedWorkerRow?.rating_atteggiamento,
      ),
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
    },
    onSave: async (patch) => {
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
    },
  });
  const anniColfCtrl = useController({
    name: "anni_esperienza_colf",
    control: gateFieldsForm.control,
  });
  const anniBadanteCtrl = useController({
    name: "anni_esperienza_badante",
    control: gateFieldsForm.control,
  });
  const anniBabysitterCtrl = useController({
    name: "anni_esperienza_babysitter",
    control: gateFieldsForm.control,
  });
  const descrizioneCtrl = useController({
    name: "descrizione_pubblica",
    control: gateFieldsForm.control,
  });
  const naspiDocCtrl = useController({
    name: "data_scadenza_naspi_doc",
    control: gateFieldsForm.control,
  });
  const ibanCtrl = useController({
    name: "iban",
    control: gateFieldsForm.control,
  });
  const nomeCtrl = useController({
    name: "nome",
    control: gateFieldsForm.control,
  });
  const cognomeCtrl = useController({
    name: "cognome",
    control: gateFieldsForm.control,
  });
  const emailCtrl = useController({
    name: "email",
    control: gateFieldsForm.control,
  });
  const telefonoCtrl = useController({
    name: "telefono",
    control: gateFieldsForm.control,
  });
  const dataNascitaCtrl = useController({
    name: "data_di_nascita",
    control: gateFieldsForm.control,
  });
  const anniEsperienzaColfValue = anniColfCtrl.field.value;
  const anniEsperienzaBadanteValue = anniBadanteCtrl.field.value;
  const anniEsperienzaBabysitterValue = anniBabysitterCtrl.field.value;
  const descrizionePubblicaValue = descrizioneCtrl.field.value;
  const naspiDocValue = naspiDocCtrl.field.value;
  const ibanValue = ibanCtrl.field.value;
  const headerNomeValue = nomeCtrl.field.value;
  const headerCognomeValue = cognomeCtrl.field.value;
  const headerEmailValue = emailCtrl.field.value;
  const headerTelefonoValue = telefonoCtrl.field.value;
  const headerDataNascitaValue = dataNascitaCtrl.field.value;
  const [statusChangeRetainedWorkerId, setStatusChangeRetainedWorkerId] =
    React.useState<string | null>(null);
  const statusChangeRetainTimeoutRef = React.useRef<number | null>(null);

  const retainSelectedWorkerAfterStatusChange = React.useCallback(
    (workerId: string) => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }

      setStatusChangeRetainedWorkerId(workerId);
      statusChangeRetainTimeoutRef.current = window.setTimeout(() => {
        setStatusChangeRetainedWorkerId((current) =>
          current === workerId ? null : current,
        );
        statusChangeRetainTimeoutRef.current = null;
      }, 10_000);
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }
    };
  }, []);

  const resolvedDocumentSectionMode =
    documentSectionMode ??
    (showSelfCertification ? "self_certification" : "hidden");
  const showDocumentSection = resolvedDocumentSectionMode !== "hidden";
  const documentSectionAfterSpecificChecks =
    resolvedDocumentSectionMode === "documents";
  const useGate1ReorderedSteps = stepLayout === "gate1_reordered";
  const getGateSectionOrderClass = React.useCallback(
    (step: number) => {
      if (!useGate1ReorderedSteps) return undefined;
      switch (step) {
        case 1:
          return "order-1";
        case 2:
          return "order-2";
        case 3:
          return "order-3";
        case 4:
          return "order-4";
        case 5:
          return "order-5";
        case 6:
          return "order-6";
        case 7:
          return "order-7";
        case 8:
          return "order-8";
        default:
          return undefined;
      }
    },
    [useGate1ReorderedSteps],
  );

  const addressMobilityAnchor = useComboboxAnchor();
  const [isEditingAvailabilityStep, setIsEditingAvailabilityStep] =
    React.useState(false);
  const [isEditingBazeChecks, setIsEditingBazeChecks] = React.useState(false);
  const [gateDraft, setGateDraft] = React.useState({
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
  });
  // Tracks the last server-derived snapshot for `gateDraft`. Each effect-driven
  // resync (es. realtime echo) merges per-field: a field is updated only when
  // the current draft value still matches the previously synced value — i.e.
  // the user has NOT typed/picked a new value locally. This prevents a remote
  // realtime echo (own debounced save or a colleague's edit on another tab)
  // from wiping in-progress edits across the ~17 controlled inputs in this
  // section. Mirrors the per-section `isEditing*` guards added in
  // `use-selected-worker-editor.ts` (commit 03ecdd3), but here a `dirtyRef`
  // style merge is a better fit because most gate inputs are always-editable
  // (no explicit edit-mode toggle) and save immediately via
  // `patchSelectedWorkerField` in their `onChange`.
  const lastSyncedGateDraftRef = React.useRef<typeof gateDraft | null>(null);
  const {
    options: referenteIdoneitaOptions,
    loading: referenteIdoneitaOptionsLoading,
  } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });

  const {
    presentationStep,
    addressStep,
    documentiStep,
    tipologiaStep,
    disponibilitaStep,
    bazeChecksStep,
    aspettiStep,
    assessmentStep,
  } = React.useMemo(() => {
    if (useGate1ReorderedSteps) {
      return {
        presentationStep: 1,
        addressStep: 3,
        documentiStep: showDocumentSection ? 4 : null,
        tipologiaStep: 5,
        disponibilitaStep: 6,
        bazeChecksStep: 2,
        aspettiStep: 7,
        assessmentStep: showAssessment ? 8 : null,
      };
    }

    let currentStep = 0;

    if (showCertificationReferente) currentStep += 1;
    if (showFollowup) currentStep += 1;

    const nextPresentationStep = ++currentStep;
    const nextDocumentiStep =
      showDocumentSection && !documentSectionAfterSpecificChecks
        ? ++currentStep
        : null;
    const nextTipologiaStep = ++currentStep;
    const nextDisponibilitaStep = ++currentStep;
    const nextBazeChecksStep = splitBazeChecksStep ? ++currentStep : null;
    const nextAspettiStep = ++currentStep;
    const lateDocumentiStep =
      showDocumentSection && documentSectionAfterSpecificChecks
        ? ++currentStep
        : null;
    const nextAssessmentStep = showAssessment ? ++currentStep : null;

    return {
      presentationStep: nextPresentationStep,
      addressStep: nextPresentationStep,
      documentiStep: nextDocumentiStep ?? lateDocumentiStep,
      tipologiaStep: nextTipologiaStep,
      disponibilitaStep: nextDisponibilitaStep,
      bazeChecksStep: nextBazeChecksStep,
      aspettiStep: nextAspettiStep,
      assessmentStep: nextAssessmentStep,
    };
  }, [
    documentSectionAfterSpecificChecks,
    showCertificationReferente,
    showDocumentSection,
    showFollowup,
    showAssessment,
    splitBazeChecksStep,
    useGate1ReorderedSteps,
  ]);
  const gatePresentationIsEditing =
    presentationEditMode === "always" ? true : isEditingHeader;
  const gateAddressIsEditing =
    addressEditMode === "always" ? true : isEditingAddress;
  const gateWorkTypesIsEditing =
    workTypesEditMode === "always" ? true : isEditingExperience;
  const gateAvailabilityStatusIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateShiftPreferencesIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateAvailabilityCalendarIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateBazeChecksIsEditing =
    bazeChecksEditMode === "always" ? true : isEditingBazeChecks;
  const gateSpecificChecksIsEditing =
    specificChecksEditMode === "always" ? true : isEditingSkills;
  const gateDocumentsIsEditing =
    resolvedDocumentSectionMode === "documents" ? true : isEditingDocuments;

  React.useEffect(() => {
    setIsEditingAvailabilityStep(false);
    setIsEditingBazeChecks(false);
    // On worker switch, drop the dirty-merge baseline so the next resync from
    // `selectedWorkerRow` populates every field freshly.
    lastSyncedGateDraftRef.current = null;
  }, [selectedWorkerId]);

  React.useEffect(() => {
    const nextSnapshot = {
      referenteIdoneita: asString(selectedWorkerRow?.referente_idoneita_id),
      referenteCertificazione: asString(
        selectedWorkerRow?.referente_certificazione_id,
      ),
      descrizionePubblica: asString(selectedWorkerRow?.descrizione_pubblica),
      livelloItaliano: asString(selectedWorkerRow?.livello_italiano),
      ratingAtteggiamento: asInputValue(
        selectedWorkerRow?.rating_atteggiamento,
      ),
      ratingCuraPersonale: asInputValue(
        selectedWorkerRow?.rating_cura_personale,
      ),
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
      pagaOrariaRichiesta: asInputValue(
        selectedWorkerRow?.paga_oraria_richiesta,
      ),
      checkAccettaMultipliContratti: asString(
        selectedWorkerRow?.check_accetta_multipli_contratti,
      ),
      dataScadenzaNaspi: asString(selectedWorkerRow?.data_scadenza_naspi),
      assessmentStatus: asString(selectedWorkerRow?.stato_lavoratore),
      assessmentFeedback: asString(selectedWorkerRow?.feedback_recruiter),
    };
    const previousSynced = lastSyncedGateDraftRef.current;
    lastSyncedGateDraftRef.current = nextSnapshot;
    if (previousSynced === null) {
      setGateDraft(nextSnapshot);
      return;
    }
    setGateDraft((current) => {
      let changed = false;
      const merged: typeof current = { ...current };
      (Object.keys(nextSnapshot) as Array<keyof typeof nextSnapshot>).forEach(
        (key) => {
          const previousValue = previousSynced[key];
          const nextValue = nextSnapshot[key];
          if (previousValue === nextValue) return;
          if (current[key] !== previousValue) {
            return;
          }
          merged[key] = nextValue;
          changed = true;
        },
      );
      return changed ? merged : current;
    });
  }, [selectedWorkerRow]);

  return {
    GATE1_IN_PERSON_BOOKING_LINKS,
    includesBabysitterType,
    activeViewId,
    addressEditMode,
    addressMobilityAnchor,
    allowCertifiedStatus,
    anniBabysitterCtrl,
    anniBadanteCtrl,
    anniColfCtrl,
    anniEsperienzaBabysitterValue,
    anniEsperienzaBadanteValue,
    anniEsperienzaColfValue,
    applyFilters,
    applySavedView,
    applyUpdatedWorkerRow,
    assessmentStep,
    aspettiStep,
    availabilityDraft,
    availabilityEditMode,
    availabilityPayload,
    availabilityReadOnlyRows,
    availabilityStatusDraft,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_HOUR_LABELS,
    addressDraft,
    addressStep,
    bazeChecksEditMode,
    bazeChecksStep,
    blacklistChecked,
    cognomeCtrl,
    commitAddressField,
    createExperienceRecord,
    createReferenceRecord,
    currentPage,
    dataNascitaCtrl,
    deleteSavedView,
    descrizioneCtrl,
    descrizionePubblicaValue,
    disponibilitaBadgeClassName,
    disponibilitaStep,
    documentSectionAfterSpecificChecks,
    documentiStep,
    documentsDraft,
    emailCtrl,
    error,
    experienceDraft,
    filterFields,
    filters,
    gate1Editor,
    gateAddressIsEditing,
    gateAvailabilityCalendarIsEditing,
    gateAvailabilityStatusIsEditing,
    gateBazeChecksIsEditing,
    gateDocumentsIsEditing,
    gateDraft,
    gateFieldsForm,
    gateFollowupFilter,
    gateLabel,
    gatePresentationIsEditing,
    gateProvinciaFilter,
    gateShiftPreferencesIsEditing,
    gateSpecificChecksIsEditing,
    gateWorkTypesIsEditing,
    generateStripeAccount,
    getGateSectionOrderClass,
    groupingOptions,
    handleAvailabilityMatrixChange,
    handleNonIdoneoReasonsChange,
    hasPendingFilters,
    headerCognomeValue,
    headerDataNascitaValue,
    headerEmailValue,
    headerNomeValue,
    headerTelefonoValue,
    ibanCtrl,
    ibanValue,
    isEditingAddress,
    isEditingDocuments,
    isEditingExperience,
    isEditingHeader,
    isEditingSkills,
    jobSearchDraft,
    listControlsSlot,
    loading,
    loadingSelectedWorkerDocuments,
    loadingSelectedWorkerExperiences,
    loadingSelectedWorkerReferences,
    loadWorkersSchema,
    lookupColorsByDomain,
    lookupOptionsByDomain,
    naspiDocCtrl,
    naspiDocValue,
    nonIdoneoReasonValues,
    nomeCtrl,
    operatorName,
    pageCount,
    patchDocumentField,
    patchExperienceRecord,
    patchReferenceRecord,
    patchSelectedWorkerField,
    patchSkillsField,
    patchWorkerAddressField,
    patchWorkerAvailabilityStatus,
    photoEditMode,
    presentationEditMode,
    presentationPhotoSlots,
    presentationStep,
    recruiterFeedbackEntries,
    referenteIdoneitaOptions,
    referenteIdoneitaOptionsLoading,
    resolvedIban,
    retainSelectedWorkerAfterStatusChange,
    saveCurrentView,
    saveWorkerAvailability,
    savedViews,
    searchValue,
    selectedWorkerIsNonIdoneo,
    selectedWorkerIsNonQualificato,
    selectedWorkerNonQualificatoIssues,
    setError,
    selectedPresentationPhotoIndex,
    selectedWorker,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    selectedWorkerExperiences,
    selectedWorkerId,
    selectedWorkerReferences,
    selectedWorkerRow,
    setAddressDraft,
    setAvailabilityDraft,
    setAvailabilityStatusDraft,
    setDocumentsDraft,
    setFilters,
    setGateDraft,
    setGateFollowupFilter,
    setGateProvinciaFilter,
    setIsEditingAddress,
    setIsEditingAvailabilityStep,
    setIsEditingBazeChecks,
    setIsEditingDocuments,
    setIsEditingExperience,
    setIsEditingHeader,
    setIsEditingSkills,
    setJobSearchDraft,
    setPageIndex,
    setSearchValue,
    setSelectedPresentationPhotoIndex,
    setSelectedWorkerId,
    setSkillsDraft,
    statusChangeRetainedWorkerId,
    showAdministrativeFields,
    showAssessment,
    showCertificationReferente,
    showDocumentSection,
    showFollowup,
    showFollowupFilter,
    showInPersonBookingLinks,
    showReferencesInWorkTypes,
    showStepper,
    skillsDraft,
    specificChecksEditMode,
    specificChecksMode,
    splitBazeChecksStep,
    stepInfoBySection,
    table,
    telefonoCtrl,
    tipologiaStep,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingDocuments,
    updatingExperience,
    updatingNonIdoneo,
    updatingNonQualificato,
    updatingSkills,
    upsertSelectedWorkerDocument,
    useGate1ReorderedSteps,
    workTypesEditMode,
    workerAddressesById,
    workerCountLabel,
    workerRows,
    workerStatus,
    workers,
  };
}
