import * as React from "react";
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CircleUserRoundIcon,
  FileSearchIcon,
  NotebookPenIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import { useComboboxAnchor } from "@/components/ui/combobox";
import {
  asLavoratoreRecord,
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
import { updateRecord } from "@/lib/record-crud";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { supabase } from "@/lib/supabase-client";
import { PROVINCIA_DROPDOWN_OPTIONS } from "@/lib/province-italiane";
import { normalizeWorkerStatus } from "../lib/status-utils";
import {
  getLookupOptionLabel,
  getLookupSelectValue,
  normalizeLookupOptionValues,
} from "../lib/lookup-utils";
import type { LavoratoreRecord } from "../types/lavoratore";
import { useProvincieOptions } from "@/hooks/use-provincie";
import {
  GATE1_IN_PERSON_BOOKING_LINKS,
  includesBabysitterType,
  sanitizeFileName,
} from "../lib/gate1-utils";
import type {
  GateFieldsFormDraft,
  GateTab,
  GateViewProps,
} from "../types/gate1-view";

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

  const [gateProvinciaFilter, setGateProvinciaFilter] = React.useState("all");
  const [gateFollowupFilter, setGateFollowupFilter] = React.useState("all");
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

  const firstGateSection = showCertificationReferente
    ? "referente"
    : showFollowup
      ? "contatti"
      : "presentazione";
  const [activeGateSection, setActiveGateSection] =
    React.useState(firstGateSection);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const addressMobilityAnchor = useComboboxAnchor();
  const [isEditingAvailabilityStep, setIsEditingAvailabilityStep] =
    React.useState(false);
  const [isEditingBazeChecks, setIsEditingBazeChecks] = React.useState(false);
  const workerPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingWorkerPhoto, setUploadingWorkerPhoto] = React.useState(false);
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

  const baseGateWorkers = React.useMemo(() => {
    const allowedStatuses = new Set(
      (Array.isArray(workerStatus) ? workerStatus : [workerStatus])
        .map((status) => normalizeWorkerStatus(status))
        .filter(Boolean),
    );
    const matchingIds = new Set(
      workerRows
        .filter((row) =>
          allowedStatuses.has(normalizeWorkerStatus(row.stato_lavoratore)),
        )
        .map((row) => row.id),
    );

    return workers.filter((worker) => matchingIds.has(worker.id));
  }, [workerStatus, workerRows, workers]);

  const workerRowsById = React.useMemo(() => {
    const rowsById = new Map<string, LavoratoreRecord>();
    for (const row of workerRows) {
      rowsById.set(row.id, row);
    }
    return rowsById;
  }, [workerRows]);

  // Dropdown provincia: value = sigla (TO, MI, MB…), label = nome esteso.
  // Il filtro Gate 1/2 lavora su `indirizzi.provincia_sigla`, quindi qui
  // restituiamo direttamente la lista canonica delle province italiane.
  const gateProvinciaOptions = React.useMemo(() => PROVINCIA_DROPDOWN_OPTIONS, []);

  const followupValueToLabel = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of lookupOptionsByDomain.get(
      "lavoratori.followup_chiamata_idoneita",
    ) ?? []) {
      map.set(option.value, option.label);
      map.set(option.label, option.label);
    }
    return map;
  }, [lookupOptionsByDomain]);

  const gateFollowupOptions = React.useMemo(() => {
    const optionLabels = (
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? []
    ).map((option) => option.label);
    const rowLabels = baseGateWorkers
      .map((worker) => {
        const raw = asString(
          workerRowsById.get(worker.id)?.followup_chiamata_idoneita,
        );
        return followupValueToLabel.get(raw) ?? raw;
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...optionLabels, ...rowLabels]));
  }, [
    baseGateWorkers,
    followupValueToLabel,
    lookupOptionsByDomain,
    workerRowsById,
  ]);

  const gateWorkers = React.useMemo(() => {
    return baseGateWorkers;
  }, [baseGateWorkers]);

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

  const documentiInRegolaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ?? [],
    [lookupOptionsByDomain],
  );
  const documentiVerificatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [],
    [lookupOptionsByDomain],
  );
  const haiReferenzeOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.hai_referenze") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.disponibilita") ?? [],
    [lookupOptionsByDomain],
  );
  const provinciaLookupOptions = useProvincieOptions();
  const sessoLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.sesso") ?? [],
    [lookupOptionsByDomain],
  );
  const nazionalitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.nazionalita") ?? [],
    [lookupOptionsByDomain],
  );
  const mobilityLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoLavoroDomesticoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.tipo_lavoro_domestico") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoRapportoLavorativoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.tipo_rapporto_lavorativo") ?? [],
    [lookupOptionsByDomain],
  );
  const lavoriAccettabiliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_lavori_accettabili") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaNelGiornoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.disponibilita_nel_giorno") ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingMultipliBambiniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_multipli_bambini",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_cani") ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_case_con_cani_grandi",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConGattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_gatti") ??
      [],
    [lookupOptionsByDomain],
  );
  const scaleSoffittiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const trasfertaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_lavori_con_trasferta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const livelloItalianoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_italiano") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloIngleseOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_inglese") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloCucinaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_cucina") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloStiroOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_stiro") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloPulizieOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_pulizie") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloBabysittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_babysitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloDogsittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_dogsitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloGiardinaggioOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_giardinaggio") ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaStiroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_stiro_esigente",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCucinaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_cucina_strutturata",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieNumeroseOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.compatibilita_famiglie_numerose") ??
      [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieMoltoEsigentiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_famiglie_molto_esigenti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaDatorePresenteOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCaseGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAnimaliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_animali_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAutonomiaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaContestiPacatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_contesti_pacati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const ratingCorporaturaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.rating_corporatura") ?? [
        {
          label: "Abile a svolgere qualsiasi lavoro",
          value: "abile_qualsiasi_lavoro",
        },
        {
          label: "Abile a svolgere attivita con intensita media",
          value: "abile_intensita_media",
        },
        {
          label: "Abile a svolgere attivita con carichi di lavoro limitati",
          value: "abile_carichi_limitati",
        },
        {
          label: "Non idonea",
          value: "non_idonea",
        },
      ],
    [lookupOptionsByDomain],
  );
  const experienceTipoLavoroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_lavoro") ??
      tipoLavoroDomesticoOptions,
    [lookupOptionsByDomain, tipoLavoroDomesticoOptions],
  );
  const experienceTipoRapportoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_rapporto") ?? [],
    [lookupOptionsByDomain],
  );
  const referenceStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("referenze_lavoratori.referenza_verificata") ??
      [],
    [lookupOptionsByDomain],
  );
  const statoLavoratoreOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ?? [];
    if (allowCertifiedStatus) return options;
    return options.filter(
      (option) =>
        option.label.trim().toLowerCase() !== "certificato" &&
        option.value.trim().toLowerCase() !== "certificato",
    );
  }, [allowCertifiedStatus, lookupOptionsByDomain]);
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const motivazioniNonIdoneoOptionsByValue = React.useMemo(() => {
    const optionsMap = new Map<string, { label: string; value: string }>();
    for (const option of motivazioniNonIdoneoOptions) {
      optionsMap.set(option.value, option);
    }
    return optionsMap;
  }, [motivazioniNonIdoneoOptions]);
  const getMotivazioneLabel = React.useCallback(
    (value: string) =>
      motivazioniNonIdoneoOptionsByValue.get(value)?.label ?? value,
    [motivazioniNonIdoneoOptionsByValue],
  );
  const followupStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? [],
    [lookupOptionsByDomain],
  );
  const funzionamentoBazeOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_funzionamento_baze",
      ) ?? [
        { label: "Non accetta", value: "non_accetta" },
        { label: "Accetta", value: "accetta" },
      ],
    [lookupOptionsByDomain],
  );
  const multipliContrattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_multipli_contratti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const paga9Options = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_paga_9_euro_netti") ??
      [],
    [lookupOptionsByDomain],
  );
  const gateTabs = React.useMemo<GateTab[]>(
    () => {
      if (useGate1ReorderedSteps) {
        return [
          ...(showFollowup
            ? [
                {
                  id: "contatti" as const,
                  label: "Referente e presentazione",
                  icon: PhoneIcon,
                },
              ]
            : [
                {
                  id: "presentazione" as const,
                  label: "Presentazione",
                  icon: CircleUserRoundIcon,
                },
              ]),
          {
            id: "check_baze" as const,
            label: "Check Baze",
            icon: ShieldCheckIcon,
          },
          {
            id: "indirizzo" as const,
            label: "Indirizzo",
            icon: CircleUserRoundIcon,
          },
          ...(showDocumentSection
            ? [
                {
                  id: "documenti" as const,
                  label: "Autocertificazioni",
                  icon: FileSearchIcon,
                },
              ]
            : []),
          { id: "tipologia" as const, label: "Tipologia lavori", icon: BadgeCheckIcon },
          {
            id: "disponibilita" as const,
            label: "Disponibilita",
            icon: CalendarDaysIcon,
          },
          {
            id: "aspetti" as const,
            label: "Check disponibilita",
            icon: ShieldCheckIcon,
          },
          ...(showAssessment
            ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
            : []),
        ];
      }

      return [
        ...(showCertificationReferente
          ? [{ id: "referente" as const, label: "Referente", icon: UsersIcon }]
          : []),
        ...(showFollowup
          ? [{ id: "contatti" as const, label: "Follow-up", icon: PhoneIcon }]
          : []),
        {
          id: "presentazione" as const,
          label: "Presentazione",
          icon: CircleUserRoundIcon,
        },
        ...(showDocumentSection && !documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Autocertificazioni",
                icon: FileSearchIcon,
              },
            ]
          : []),
        { id: "tipologia" as const, label: "Tipologia lavori", icon: BadgeCheckIcon },
        { id: "disponibilita" as const, label: "Disponibilita", icon: CalendarDaysIcon },
        {
          id: "aspetti" as const,
          label:
            specificChecksMode === "confirmation"
              ? "Competenze"
              : "Aspetti specifici",
          icon: ShieldCheckIcon,
        },
        ...(showDocumentSection && documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Documenti",
                icon: NotebookPenIcon,
              },
            ]
          : []),
        ...(showAssessment
          ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
          : []),
      ];
    },
    [
      documentSectionAfterSpecificChecks,
      showCertificationReferente,
      showAssessment,
      showDocumentSection,
      showFollowup,
      specificChecksMode,
      useGate1ReorderedSteps,
    ],
  );

  const scrollToSection = React.useCallback((value: string) => {
    setActiveGateSection(value);
    const container = detailScrollRef.current;
    const target = sectionRefs.current[value];
    if (!container || !target) return;
    container.scrollTo({
      top: Math.max(target.offsetTop - 108, 0),
      behavior: "smooth",
    });
  }, []);

  const registerGateSectionRef = React.useCallback(
    (sectionId: string, enabled = true) =>
      (node: HTMLDivElement | null) => {
        if (!enabled) return;
        sectionRefs.current[sectionId] = node;
      },
    [],
  );

  React.useEffect(() => {
    const container = detailScrollRef.current;
    if (!container || !selectedWorkerId) return;

    const syncActiveSection = () => {
      const scrollTop = container.scrollTop;
      let nextActive = gateTabs[0]?.id ?? firstGateSection;

      for (const tab of gateTabs) {
        const node = sectionRefs.current[tab.id];
        if (!node) continue;
        if (node.offsetTop - 140 <= scrollTop) {
          nextActive = tab.id;
        } else {
          break;
        }
      }

      setActiveGateSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };

    syncActiveSection();
    container.addEventListener("scroll", syncActiveSection, { passive: true });
    return () => container.removeEventListener("scroll", syncActiveSection);
  }, [firstGateSection, gateTabs, selectedWorkerId]);

  React.useEffect(() => {
    setActiveGateSection(firstGateSection);
  }, [firstGateSection, selectedWorkerId]);

  React.useEffect(() => {
    setIsEditingAvailabilityStep(false);
    setIsEditingBazeChecks(false);
    // On worker switch, drop the dirty-merge baseline so the next resync from
    // `selectedWorkerRow` populates every field freshly.
    lastSyncedGateDraftRef.current = null;
  }, [selectedWorkerId]);

  const selectedWorkerStatusAlert = React.useMemo(() => {
    if (!selectedWorkerRow) return null;

    if (selectedWorkerIsNonIdoneo) {
      const fallbackReasons = readArrayStrings(
        selectedWorkerRow.motivazione_non_idoneo,
      );
      const reasonValues =
        nonIdoneoReasonValues.length > 0
          ? nonIdoneoReasonValues
          : fallbackReasons;
      const reasonLabel = reasonValues
        .map(getMotivazioneLabel)
        .filter((value) => value.trim().length > 0)
        .join(" • ");

      return {
        statusLabel: "Non idoneo",
        reasonLabel: reasonLabel || "Nessuna motivazione indicata",
        tone: "critical" as const,
      };
    }

    if (selectedWorkerIsNonQualificato) {
      const reasonLabel = selectedWorkerNonQualificatoIssues
        .map((issue) => issue.title)
        .filter((value) => value.trim().length > 0)
        .join(" • ");

      return {
        statusLabel: "Non qualificato",
        reasonLabel: reasonLabel || "Nessuna motivazione indicata",
        tone: "muted" as const,
      };
    }

    return null;
  }, [
    getMotivazioneLabel,
    nonIdoneoReasonValues,
    selectedWorkerIsNonIdoneo,
    selectedWorkerIsNonQualificato,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerRow,
  ]);

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
      // First sync for this worker — populate every field.
      setGateDraft(nextSnapshot);
      return;
    }
    // Per-field merge: replace a field only when the local draft value still
    // matches the previously synced server value (i.e. the user has NOT typed
    // a new value locally yet). This prevents a realtime echo from wiping
    // in-progress edits across the gate draft inputs.
    setGateDraft((current) => {
      let changed = false;
      const merged: typeof current = { ...current };
      (Object.keys(nextSnapshot) as Array<keyof typeof nextSnapshot>).forEach(
        (key) => {
          const previousValue = previousSynced[key];
          const nextValue = nextSnapshot[key];
          if (previousValue === nextValue) return;
          if (current[key] !== previousValue) {
            // User has a pending local edit for this field — keep it.
            return;
          }
          merged[key] = nextValue;
          changed = true;
        },
      );
      return changed ? merged : current;
    });
  }, [selectedWorkerRow]);

  const openWorkerPhotoPicker = React.useCallback(() => {
    if (uploadingWorkerPhoto) return;
    workerPhotoInputRef.current?.click();
  }, [uploadingWorkerPhoto]);

  const handleWorkerPhotoInputChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (files.length === 0 || !selectedWorkerId) return;

      setError(null);
      setUploadingWorkerPhoto(true);

      try {
        const nextPhotos: MinimalAttachment[] = normalizeAttachmentArray(
          selectedWorkerRow?.foto,
        );

        for (const [index, file] of files.entries()) {
          const safeName = sanitizeFileName(file.name || "foto");
          const storagePath = [
            "lavoratori",
            selectedWorkerId,
            "foto",
            `${Date.now()}-${index}-${safeName}`,
          ].join("/");

          const uploadResult = await supabase.storage
            .from("baze-bucket")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          nextPhotos.push(buildAttachmentPayload(file, storagePath));
        }

        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: nextPhotos,
        });
        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando la foto",
        );
      } finally {
        setUploadingWorkerPhoto(false);
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
    ],
  );

  const handlePrimaryWorkerPhotoChange = React.useCallback(
    async (index: number) => {
      if (!selectedWorkerId) return;

      const existingPhotos = normalizeAttachmentArray(selectedWorkerRow?.foto);
      if (existingPhotos.length === 0) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      if (index <= 0 || index >= existingPhotos.length) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      setError(null);

      try {
        const [selectedPhoto] = existingPhotos.splice(index, 1);
        if (!selectedPhoto) return;

        const reorderedPhotos = [selectedPhoto, ...existingPhotos];
        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: reorderedPhotos,
        });

        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
        setSelectedPresentationPhotoIndex(0);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando la foto principale",
        );
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
      setSelectedPresentationPhotoIndex,
    ],
  );

  React.useEffect(() => {
    if (!selectedWorkerId) {
      if (gateWorkers.length > 0) {
        setSelectedWorkerId(gateWorkers[0].id);
      }
      return;
    }

    if (
      statusChangeRetainedWorkerId === selectedWorkerId &&
      selectedWorker &&
      selectedWorkerRow
    ) {
      return;
    }

    if (!gateWorkers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(gateWorkers[0]?.id ?? null);
    }
  }, [
    gateWorkers,
    selectedWorker,
    selectedWorkerId,
    selectedWorkerRow,
    setSelectedWorkerId,
    statusChangeRetainedWorkerId,
  ]);
  return {
    GATE1_IN_PERSON_BOOKING_LINKS,
    includesBabysitterType,
    activeGateSection,
    activeViewId,
    addressEditMode,
    addressMobilityAnchor,
    anniBabysitterCtrl,
    anniBadanteCtrl,
    anniColfCtrl,
    anniEsperienzaBabysitterValue,
    anniEsperienzaBadanteValue,
    anniEsperienzaColfValue,
    applyFilters,
    applySavedView,
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
    babysittingMultipliBambiniOptions,
    babysittingNeonatiOptions,
    bazeChecksEditMode,
    bazeChecksStep,
    blacklistChecked,
    caseConCaniGrandiOptions,
    caseConCaniOptions,
    caseConGattiOptions,
    cognomeCtrl,
    commitAddressField,
    compatibilitaAnimaliOptions,
    compatibilitaAutonomiaOptions,
    compatibilitaCaseGrandiOptions,
    compatibilitaContestiPacatiOptions,
    compatibilitaCucinaOptions,
    compatibilitaDatorePresenteOptions,
    compatibilitaFamiglieMoltoEsigentiOptions,
    compatibilitaFamiglieNumeroseOptions,
    compatibilitaNeonatiOptions,
    compatibilitaStiroOptions,
    createExperienceRecord,
    createReferenceRecord,
    currentPage,
    dataNascitaCtrl,
    deleteSavedView,
    descrizioneCtrl,
    descrizionePubblicaValue,
    detailScrollRef,
    disponibilitaBadgeClassName,
    disponibilitaLookupOptions,
    disponibilitaNelGiornoOptions,
    disponibilitaStep,
    documentSectionAfterSpecificChecks,
    documentiInRegolaOptions,
    documentiStep,
    documentiVerificatiOptions,
    documentsDraft,
    emailCtrl,
    error,
    experienceDraft,
    experienceTipoLavoroOptions,
    experienceTipoRapportoOptions,
    filterFields,
    filters,
    followupStatusOptions,
    funzionamentoBazeOptions,
    gate1Editor,
    gateAddressIsEditing,
    gateAvailabilityCalendarIsEditing,
    gateAvailabilityStatusIsEditing,
    gateBazeChecksIsEditing,
    gateDocumentsIsEditing,
    gateDraft,
    gateFieldsForm,
    gateFollowupFilter,
    gateFollowupOptions,
    gateLabel,
    gatePresentationIsEditing,
    gateProvinciaFilter,
    gateProvinciaOptions,
    gateShiftPreferencesIsEditing,
    gateSpecificChecksIsEditing,
    gateTabs,
    gateWorkTypesIsEditing,
    gateWorkers,
    generateStripeAccount,
    getGateSectionOrderClass,
    groupingOptions,
    haiReferenzeOptions,
    handleAvailabilityMatrixChange,
    handleNonIdoneoReasonsChange,
    handlePrimaryWorkerPhotoChange,
    handleWorkerPhotoInputChange,
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
    lavoriAccettabiliOptions,
    listControlsSlot,
    loading,
    loadingSelectedWorkerDocuments,
    loadingSelectedWorkerExperiences,
    loadingSelectedWorkerReferences,
    livelloBabysittingOptions,
    livelloCucinaOptions,
    livelloDogsittingOptions,
    livelloGiardinaggioOptions,
    livelloIngleseOptions,
    livelloItalianoOptions,
    livelloPulizieOptions,
    livelloStiroOptions,
    loadWorkersSchema,
    lookupColorsByDomain,
    mobilityLookupOptions,
    motivazioniNonIdoneoOptions,
    multipliContrattiOptions,
    naspiDocCtrl,
    naspiDocValue,
    nazionalitaLookupOptions,
    nonIdoneoReasonValues,
    nomeCtrl,
    openWorkerPhotoPicker,
    operatorName,
    pageCount,
    paga9Options,
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
    provinciaLookupOptions,
    ratingCorporaturaOptions,
    recruiterFeedbackEntries,
    referenceStatusOptions,
    registerGateSectionRef,
    referenteIdoneitaOptions,
    referenteIdoneitaOptionsLoading,
    resolvedIban,
    retainSelectedWorkerAfterStatusChange,
    saveCurrentView,
    saveWorkerAvailability,
    savedViews,
    scaleSoffittiOptions,
    scrollToSection,
    searchValue,
    sessoLookupOptions,
    setError,
    selectedPresentationPhotoIndex,
    selectedWorker,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    selectedWorkerExperiences,
    selectedWorkerId,
    selectedWorkerReferences,
    selectedWorkerRow,
    selectedWorkerStatusAlert,
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
    statoLavoratoreOptions,
    stepInfoBySection,
    table,
    telefonoCtrl,
    tipoLavoroDomesticoOptions,
    tipoRapportoLavorativoOptions,
    tipologiaStep,
    trasfertaOptions,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingDocuments,
    updatingExperience,
    updatingNonIdoneo,
    updatingNonQualificato,
    updatingSkills,
    uploadingWorkerPhoto,
    upsertSelectedWorkerDocument,
    useGate1ReorderedSteps,
    workTypesEditMode,
    workerAddressesById,
    workerCountLabel,
    workerPhotoInputRef,
    workerRowsById,
    workers,
  };
}
