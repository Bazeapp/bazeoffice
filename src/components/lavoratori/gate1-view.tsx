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

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { AvailabilityStatusCard } from "@/components/lavoratori/availability-status-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { WorkerDetailShell } from "@/components/lavoratori/worker-detail-shell";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import { useComboboxAnchor } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAvailabilityComputedAt,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "@/features/lavoratori/lib/availability-utils";
import { FieldLabel } from "@/components/ui/field";
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  getStripeAccountMissingRequirements,
  normalizeDomesticRoleLabels,
  normalizeDomesticRoleLookupValues,
  parseNumberValue,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import { getLookupOptionLabel } from "@/features/lavoratori/lib/lookup-utils";
import { useLavoratoriData } from "@/hooks/use-lavoratori-data";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { Gate1WorkerProvider } from "@/components/lavoratori/gate1/gate1-worker-context";
import { GateContactsCard } from "@/components/lavoratori/gate1/gate-contacts-card";
import {
  GateCertificationReferenteCard,
  GateReferenteCard,
} from "@/components/lavoratori/gate1/gate-referente-cards";
import { GatePresentationCard } from "@/components/lavoratori/gate1/gate-presentation-card";
import { GateAssessmentCard } from "@/components/lavoratori/gate1/gate-assessment-card";
import {
  GateAdministrativeFieldsCard,
  GateDocumentIdentityCard,
  GateSelfCertificationCard,
} from "@/components/lavoratori/gate1/gate-verification-cards";
import {
  GateBazeChecksCard,
  GateShiftPreferencesCard,
  GateSpecificChecksCard,
} from "@/components/lavoratori/gate1/gate-checks-cards";
import { GateWorkTypesCard } from "@/components/lavoratori/gate1/gate-work-types-card";
import { GateSkillConfirmationsCard } from "@/components/lavoratori/gate1/gate-skill-confirmations-card";
import { GateStepSection } from "@/components/lavoratori/gate1/gate-field-primitives";
import { useController } from "react-hook-form";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name";
import { RecruiterFeedbackButton } from "@/components/lavoratori/recruiter-feedback-sheet";
import { updateRecord } from "@/lib/anagrafiche-api";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { supabase } from "@/lib/supabase-client";
import { PROVINCIA_DROPDOWN_OPTIONS } from "@/lib/province-italiane";
import { normalizeWorkerStatus } from "@/features/lavoratori/lib/status-utils";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import { useProvincieOptions } from "@/hooks/use-provincie";

type GateTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// FASE 5 BIS — campi di dettaglio di gate1 (autosave via useController).
// data_scadenza_naspi ha due chiavi distinte: _worker (lavoratori) e _doc
// (documento), instradate a patch diverse.
type GateFieldsFormDraft = {
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
};

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

type GateSectionId =
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

type GateStepInfo = {
  title: React.ReactNode;
  content: React.ReactNode;
};

type GateViewProps = {
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

const GATE1_IN_PERSON_BOOKING_LINKS = [
  {
    label: "Colloquio Milano",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-milano",
  },
  {
    label: "Colloquio Torino",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-torino",
  },
  {
    label: "Colloquio Monza",
    href: "https://cal.com/baze-lavoro/colloquio-monza",
  },
] as const;

function includesBabysitterType(
  values: string[],
  options: Array<{ label: string; value: string }>,
) {
  return normalizeDomesticRoleLabels(values).some((label) => label === "Tata")
    || normalizeDomesticRoleLookupValues(values, options).some((value) => {
      const label = getLookupOptionLabel(options, value);
      return label.toLowerCase().includes("babysitter");
    });
}

// GateInfoCard estratto in ./gate1/gate-info-card (D2).

// GateStepSection + le primitive di campo pure (GateLookupBadge,
// GateFieldLabelWithInfo, GateLevelSegmentedField, GateLookupConfirmationField,
// GateStarRatingField, GateAcceptField, GateAllowedWorkField) +
// getLookupDisplayOption / EMPTY_SELECT_VALUE estratti in
// ./gate1/gate-field-primitives (D2).

// GateContactsCard estratto in ./gate1/gate-contacts-card (D2): consuma il
// Context di dominio (workerRow + patchSelectedWorkerField), niente prop-drilling.

// GateReferenteCard + GateCertificationReferenteCard (+ OperatorSelectOption,
// resolveOperatorLabel) estratti in ./gate1/gate-referente-cards (D2).

// GatePresentationCard estratto in ./gate1/gate-presentation-card (D2).

// GateAssessmentCard estratto in ./gate1/gate-assessment-card (D2).

// GateAcceptField, getLookupDisplayOption, GateLookupBadge,
// GateFieldLabelWithInfo, GateLevelSegmentedField, GateLookupConfirmationField,
// GateStarRatingField estratti in ./gate1/gate-field-primitives (D2).

// GateBazeChecksCard, GateSpecificChecksCard, GateShiftPreferencesCard estratti
// in ./gate1/gate-checks-cards (D2).


export function Gate1View({
  gateLabel = "Gate 1",
  workerStatus = "qualificato",
  workerCountLabel = "qualificati",
  listControlsSlot,
  showFollowup = true,
  showSelfCertification = true,
  showReferencesInWorkTypes = false,
  showAdministrativeFields = false,
  showStepper = false,
  splitBazeChecksStep = false,
  stepInfoBySection = {},
  presentationEditMode = "always",
  photoEditMode = "hidden",
  addressEditMode = "always",
  workTypesEditMode = "always",
  availabilityEditMode = "always",
  bazeChecksEditMode = "always",
  documentSectionMode,
  showAssessment = true,
  specificChecksMode = "gate1",
  specificChecksEditMode = "always",
  applyGate1BaseFilters = true,
  showCertificationReferente = false,
  showFollowupFilter = true,
  allowCertifiedStatus = false,
  showInPersonBookingLinks = false,
  stepLayout = "default",
}: GateViewProps) {
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
    headerDraft,
    setHeaderDraft,
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
    },
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        const v = typeof rawValue === "string" ? rawValue : "";
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
            await patchWorkerAvailabilityStatus({
              data_ritorno_disponibilita: v || null,
            });
            break;
          case "descrizione_pubblica":
            await patchSelectedWorkerField("descrizione_pubblica", v || null);
            break;
          case "paga_oraria_richiesta":
            await patchSelectedWorkerField(
              "paga_oraria_richiesta",
              parseNumberValue(v),
            );
            break;
          case "data_scadenza_naspi_worker":
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
  const dataRitornoCtrl = useController({
    name: "data_ritorno_disponibilita",
    control: gateFieldsForm.control,
  });
  const descrizioneCtrl = useController({
    name: "descrizione_pubblica",
    control: gateFieldsForm.control,
  });
  const pagaCtrl = useController({
    name: "paga_oraria_richiesta",
    control: gateFieldsForm.control,
  });
  const naspiWorkerCtrl = useController({
    name: "data_scadenza_naspi_worker",
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
  const dataRitornoValue = dataRitornoCtrl.field.value;
  const descrizionePubblicaValue = descrizioneCtrl.field.value;
  const pagaOrariaRichiestaValue = pagaCtrl.field.value;
  const dataScadenzaNaspiGateValue = naspiWorkerCtrl.field.value;
  const naspiDocValue = naspiDocCtrl.field.value;
  const ibanValue = ibanCtrl.field.value;
  const headerNomeValue = nomeCtrl.field.value;
  const headerCognomeValue = cognomeCtrl.field.value;
  const headerEmailValue = emailCtrl.field.value;
  const headerTelefonoValue = telefonoCtrl.field.value;
  const headerDataNascitaValue = dataNascitaCtrl.field.value;

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
  const [statusChangeRetainedWorkerId, setStatusChangeRetainedWorkerId] =
    React.useState<string | null>(null);
  const statusChangeRetainTimeoutRef = React.useRef<number | null>(null);
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

  return (
    <Gate1WorkerProvider editor={gate1Editor} workerRow={selectedWorkerRow}>
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleWorkerPhotoInputChange}
      />
      {showInPersonBookingLinks ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4">
          {GATE1_IN_PERSON_BOOKING_LINKS.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm">
              <a href={link.href} target="_blank" rel="noreferrer">
                <CalendarDaysIcon className="size-4" />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
      <div
        className={
          selectedWorkerId
            ? "grid min-h-0 flex-1 gap-3 px-4 pb-2 pt-4 lg:grid-cols-[332px_minmax(0,1fr)]"
            : "grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-2 pt-4"
        }
      >
        <div className="flex min-h-0 flex-col gap-2">
          <SideCardsPanel
            title={gateLabel}
            headerClassName="hidden"
            contentClassName="space-y-3 px-5 pt-3 pb-3"
            className="h-full gap-2"
          >
            <DataTableToolbar
              table={table}
              searchValue={searchValue}
              onSearchValueChange={setSearchValue}
              searchCommitDebounceMs={500}
              filters={filters}
              onFiltersChange={setFilters}
              filterFields={filterFields}
              searchPlaceholder="Cerca lavoratori..."
              groupOptions={groupingOptions}
              compactControls
              savedViews={savedViews.map((view) => ({
                id: view.id,
                name: view.name,
                updatedAt: view.updatedAt,
              }))}
              activeViewId={activeViewId}
              onSaveCurrentView={saveCurrentView}
              onApplySavedView={applySavedView}
              onDeleteSavedView={deleteSavedView}
              onApplyFilters={applyFilters}
              hasPendingFilters={hasPendingFilters}
              onRequestSchema={loadWorkersSchema}
            />

            <div className="flex flex-col gap-3">
              {listControlsSlot}

              <div className="space-y-1">
                <FieldLabel>Provincia</FieldLabel>
                <Select
                  value={gateProvinciaFilter}
                  onValueChange={setGateProvinciaFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tutte le province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le province</SelectItem>
                    {gateProvinciaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showFollowupFilter ? (
                <div className="space-y-1">
                  <FieldLabel>Follow-up</FieldLabel>
                  <Select
                    value={gateFollowupFilter}
                    onValueChange={setGateFollowupFilter}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tutti i follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i follow-up</SelectItem>
                      {gateFollowupOptions.map((followup) => (
                        <SelectItem key={followup} value={followup}>
                          {followup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all" ? (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGateProvinciaFilter("all");
                    setGateFollowupFilter("all");
                  }}
                >
                  Reset filtri
                </Button>
              </div>
            ) : null}

            {loading ? (
              <p className="text-muted-foreground py-3 text-sm">
                Caricamento lavoratori...
              </p>
            ) : error ? (
              <p className="py-3 text-sm text-red-600">{error}</p>
            ) : gateWorkers.length === 0 ? (
              <p className="text-muted-foreground py-3 text-sm">
                {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all"
                  ? "Nessun lavoratore corrisponde ai filtri selezionati."
                  : "Nessun lavoratore trovato."}
              </p>
            ) : (
              <div className="space-y-2">
                {gateWorkers.map((worker) => {
                  const row = workerRowsById.get(worker.id);
                  const followupRaw = asString(row?.followup_chiamata_idoneita);
                  const followupOption = followupStatusOptions.find(
                    (option) =>
                      option.value === followupRaw ||
                      option.label === followupRaw,
                  );
                  return (
                    <LavoratoreCard
                      key={worker.id}
                      worker={worker}
                      isActive={worker.id === selectedWorkerId}
                      variant="gate1"
                      gate1Summary={{
                        // Mostra la sigla (es. "TO") quando disponibile, altrimenti
                        // ripiega sul nome esteso. La sigla è la sorgente canonica
                        // usata anche dal filtro Gate 1/2.
                        // Gate 1 RPC espone già `provincia_sigla` nella row;
                        // per Gate 2 (no RPC) la prendiamo dall'indirizzo di residenza.
                        provincia:
                          asString(row?.provincia_sigla) ||
                          asString(
                            (workerAddressesById?.get(worker.id) ?? []).find(
                              (a) =>
                                asString(a.tipo_indirizzo).toLowerCase() ===
                                "residenza",
                            )?.provincia_sigla ??
                              (workerAddressesById?.get(worker.id) ?? [])[0]
                                ?.provincia_sigla,
                          ) ||
                          asString(row?.provincia),
                        createdAt: asString(row?.creato_il),
                        followup: followupOption?.label ?? followupRaw,
                      }}
                      onClick={() =>
                        setSelectedWorkerId((previous) =>
                          previous === worker.id ? null : worker.id,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </SideCardsPanel>

          <Pagination className="px-1">
            <Pagination.Pages
              page={currentPage}
              pageCount={pageCount}
              onChange={(nextPage) => {
                if (loading) return;
                setPageIndex(Math.max(nextPage - 1, 0));
              }}
            />
            <span className="text-muted-foreground tabular-nums">
              {gateWorkers.length} {workerCountLabel}
            </span>
          </Pagination>
        </div>

        {selectedWorkerId ? (
          <WorkerDetailShell
            key={selectedWorkerId ?? "__empty__"}
            sectionRef={detailScrollRef}
            tabs={gateTabs}
            activeSection={activeGateSection}
            onSectionChange={scrollToSection}
          >
            {selectedWorker && selectedWorkerRow ? (
              <div
                className={
                  useGate1ReorderedSteps ? "flex flex-col gap-6" : "space-y-6"
                }
              >
                {showCertificationReferente ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={(node) => {
                      sectionRefs.current.referente = node;
                    }}
                  >
                    <GateStepSection
                      step={1}
                      isFirst
                      showStepper={showStepper}
                      info={stepInfoBySection.referente}
                    >
                      <GateCertificationReferenteCard
                        referenteCertificazioneValue={
                          gateDraft.referenteCertificazione
                        }
                        referenteIdoneitaValue={gateDraft.referenteIdoneita}
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                        onReferenteCertificazioneChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            referenteCertificazione: value ?? "",
                          }));
                          void patchSelectedWorkerField(
                            "referente_certificazione_id",
                            value,
                          );
                        }}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                {showFollowup ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={(node) => {
                      sectionRefs.current.contatti = node;
                    }}
                  >
                    <GateStepSection
                      step={1}
                      isFirst={!showCertificationReferente}
                      showStepper={showStepper}
                      info={stepInfoBySection.contatti}
                    >
                      <GateReferenteCard
                        value={gateDraft.referenteIdoneita}
                        referenteCertificazioneValue={
                          gateDraft.referenteCertificazione
                        }
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                        onChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            referenteIdoneita: value ?? "",
                          }));
                          void patchSelectedWorkerField(
                            "referente_idoneita_id",
                            value,
                          );
                        }}
                      />
                      <GateContactsCard options={followupStatusOptions} />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(presentationStep)}
                  ref={(node) => {
                    sectionRefs.current.presentazione = node;
                  }}
                >
                  <GateStepSection
                    step={presentationStep}
                    isFirst={!showFollowup && !showCertificationReferente}
                    showStepper={
                      showStepper && !(useGate1ReorderedSteps && showFollowup)
                    }
                    reserveStepperSpace={useGate1ReorderedSteps && showFollowup}
                    info={stepInfoBySection.presentazione}
                  >
                    <GatePresentationCard
                      worker={selectedWorker}
                      workerRow={selectedWorkerRow}
                      statusAlert={selectedWorkerStatusAlert}
                      headerDraft={{
                        ...headerDraft,
                        nome: headerNomeValue,
                        cognome: headerCognomeValue,
                        email: headerEmailValue,
                        telefono: headerTelefonoValue,
                        data_di_nascita: headerDataNascitaValue,
                      }}
                      descriptionValue={descrizionePubblicaValue}
                      livelloItaliano={gateDraft.livelloItaliano}
                      sessoOptions={sessoLookupOptions}
                      nazionalitaOptions={nazionalitaLookupOptions}
                      presentationPhotoSlots={presentationPhotoSlots}
                      selectedPresentationPhotoIndex={
                        selectedPresentationPhotoIndex
                      }
                      isEditing={gatePresentationIsEditing}
                      showEditAction={presentationEditMode === "toggle"}
                      showUploadPhotoAction={photoEditMode === "editable"}
                      uploadingPhoto={uploadingWorkerPhoto}
                      onToggleEdit={() =>
                        setIsEditingHeader((current) => !current)
                      }
                      onUploadPhoto={openWorkerPhotoPicker}
                      onSelectedPresentationPhotoIndexChange={
                        handlePrimaryWorkerPhotoChange
                      }
                      livelloItalianoOptions={livelloItalianoOptions}
                      onHeaderChange={(field, value) => {
                        if (field === "descrizione_pubblica") {
                          descrizioneCtrl.field.onChange(value);
                          return;
                        }

                        if (field === "nome") nomeCtrl.field.onChange(value);
                        else if (field === "cognome") cognomeCtrl.field.onChange(value);
                        else if (field === "email") emailCtrl.field.onChange(value);
                        else if (field === "telefono") telefonoCtrl.field.onChange(value);
                        else if (field === "data_di_nascita") dataNascitaCtrl.field.onChange(value);
                        else if (field === "sesso" || field === "nazionalita") {
                          void patchSelectedWorkerField(field, value || null);
                        }
                      }}
                      onLivelloItalianoChange={(value) => {
                        setGateDraft((current) => ({
                          ...current,
                          livelloItaliano: value,
                        }));
                        void patchSelectedWorkerField("livello_italiano", value || null);
                      }}
                    />

                  </GateStepSection>
                </div>

                <div
                  className={getGateSectionOrderClass(addressStep)}
                  ref={(node) => {
                    sectionRefs.current.indirizzo = node;
                  }}
                >
                  <GateStepSection
                    step={addressStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.indirizzo}
                  >
                    <AddressSectionCard
                      isEditing={gateAddressIsEditing}
                      isUpdating={updatingNonQualificato}
                      showEditAction={addressEditMode === "toggle"}
                      showMobility={false}
                      addressDraft={addressDraft}
                      provinciaOptions={provinciaLookupOptions}
                      mobilityOptions={mobilityLookupOptions}
                      selectedVia={asString(selectedWorkerAddress?.via) || null}
                      selectedCivico={asString(selectedWorkerAddress?.civico) || null}
                      selectedCap={asString(selectedWorkerAddress?.cap) || null}
                      selectedCitta={asString(selectedWorkerAddress?.citta) || null}
                      selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}

                      selectedMobility={readArrayStrings(
                        selectedWorkerRow.come_ti_sposti,
                      )}
                      mobilityAnchor={addressMobilityAnchor}
                      onToggleEdit={() =>
                        setIsEditingAddress((current) => !current)
                      }
                      onFieldChange={(field, value) => {
                        setAddressDraft((current) => ({ ...current, [field]: value }));
                        if (field === "provincia") {
                          void patchWorkerAddressField("provincia", value || null);
                        }
                      }}
                      onFieldCommit={(field, value) => {
                        if (field !== "provincia") void commitAddressField(field, value);
                      }}
                      onMobilityChange={(values) => {
                        setAddressDraft((current) => ({
                          ...current,
                          come_ti_sposti: values,
                        }));
                        void patchSelectedWorkerField(
                          "come_ti_sposti",
                          values.length > 0 ? values : null,
                        );
                      }}
                    />
                  </GateStepSection>
                </div>

                {showDocumentSection && !documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.documenti = node;
                    }}
                  >
                    <GateStepSection
                      step={documentiStep ?? 0}
                      showStepper={showStepper}
                      info={stepInfoBySection.documenti}
                    >
                      <GateSelfCertificationCard
                        documentiInRegola={asString(
                          selectedWorkerRow.documenti_in_regola,
                        )}
                        haiReferenze={asString(selectedWorkerRow.hai_referenze)}
                        documentiOptions={documentiInRegolaOptions}
                        referenzeOptions={haiReferenzeOptions}
                        onDocumentiChange={(value) =>
                          void patchSelectedWorkerField(
                            "documenti_in_regola",
                            value || null,
                          )
                        }
                        onReferenzeChange={(value) =>
                          void patchSelectedWorkerField(
                            "hai_referenze",
                            value || null,
                          )
                        }
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(tipologiaStep)}
                  ref={(node) => {
                    sectionRefs.current.tipologia = node;
                  }}
                >
                  <GateStepSection
                    step={tipologiaStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.tipologia}
                  >
                    <GateWorkTypesCard
                      workerId={selectedWorkerId}
                      haiReferenze={asString(selectedWorkerRow.hai_referenze)}
                      referenzeOptions={haiReferenzeOptions}
                      allowedWorks={jobSearchDraft.tipo_lavoro_domestico}
                      allowedWorkOptions={tipoLavoroDomesticoOptions}
                      isEditing={gateWorkTypesIsEditing}
                      showReferencesField={showReferencesInWorkTypes}
                      showEditAction={workTypesEditMode === "toggle"}
                      onToggleEdit={() =>
                        setIsEditingExperience((current) => !current)
                      }
                      onReferenzeChange={(value) =>
                        void patchSelectedWorkerField(
                          "hai_referenze",
                          value || null,
                        )
                      }
                      experienceDraft={experienceDraft}
                      selectedAnniEsperienzaColf={anniEsperienzaColfValue}
                      selectedAnniEsperienzaBadante={anniEsperienzaBadanteValue}
                      selectedAnniEsperienzaBabysitter={anniEsperienzaBabysitterValue}
                      experiences={selectedWorkerExperiences}
                      experiencesLoading={loadingSelectedWorkerExperiences}
                      references={selectedWorkerReferences}
                      referencesLoading={loadingSelectedWorkerReferences}
                      lookupColorsByDomain={lookupColorsByDomain}
                      experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                      experienceTipoRapportoOptions={
                        experienceTipoRapportoOptions
                      }
                      referenceStatusOptions={referenceStatusOptions}
                      isUpdatingExperience={updatingExperience}
                      onAllowedWorksChange={(values) => {
                        setJobSearchDraft((current) => ({
                          ...current,
                          tipo_lavoro_domestico: values,
                        }));
                        void patchSelectedWorkerField(
                          "tipo_lavoro_domestico",
                          values.length > 0 ? values : null,
                        );
                      }}
                      onAnniEsperienzaColfChange={(value) => {
                        anniColfCtrl.field.onChange(value);
                      }}
                      onAnniEsperienzaBadanteChange={(value) => {
                        anniBadanteCtrl.field.onChange(value);
                      }}
                      onAnniEsperienzaBabysitterChange={(value) => {
                        anniBabysitterCtrl.field.onChange(value);
                      }}
                      onExperiencePatch={(experienceId, patch) =>
                        void patchExperienceRecord(experienceId, patch)
                      }
                      onExperienceCreate={(values) =>
                        void createExperienceRecord(values)
                      }
                      onReferencePatch={(referenceId, patch) =>
                        void patchReferenceRecord(referenceId, patch)
                      }
                      onReferenceCreate={(values) =>
                        void createReferenceRecord(values)
                      }
                    />
                  </GateStepSection>
                </div>

                <div
                  className={
                    useGate1ReorderedSteps && splitBazeChecksStep
                      ? "contents"
                      : getGateSectionOrderClass(disponibilitaStep)
                  }
                  ref={(node) => {
                    if (!useGate1ReorderedSteps || !splitBazeChecksStep) {
                      sectionRefs.current.disponibilita = node;
                    }
                  }}
                >
                  {splitBazeChecksStep ? (
                    <>
                      <div
                        className={getGateSectionOrderClass(disponibilitaStep)}
                        ref={(node) => {
                          if (useGate1ReorderedSteps) {
                            sectionRefs.current.disponibilita = node;
                          }
                        }}
                      >
                        <GateStepSection
                          step={disponibilitaStep}
                          showStepper={showStepper}
                          info={stepInfoBySection.disponibilita}
                        >
                          <AvailabilityStatusCard
                            isEditing={gateAvailabilityStatusIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            isUpdating={updatingAvailabilityStatus}
                            disponibilitaOptions={disponibilitaLookupOptions}
                            draft={availabilityStatusDraft}
                            selectedDisponibilita={asString(
                              selectedWorkerRow.disponibilita,
                            )}
                            selectedDisponibilitaBadgeClassName={
                              disponibilitaBadgeClassName
                            }
                            selectedDataRitorno={dataRitornoValue}
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            onDisponibilitaChange={(value) => {
                              setAvailabilityStatusDraft((current) => ({
                                ...current,
                                disponibilita: value,
                              }));
                              void patchWorkerAvailabilityStatus({
                                disponibilita: value || null,
                              });
                            }}
                            onDataRitornoChange={dataRitornoCtrl.field.onChange}
                            onDataRitornoBlur={() => undefined}
                          />
                          <GateShiftPreferencesCard
                            isEditing={gateShiftPreferencesIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            lookupColorsByDomain={lookupColorsByDomain}
                            tipoRapportoLavorativo={
                              jobSearchDraft.tipo_rapporto_lavorativo
                            }
                            tipoRapportoOptions={tipoRapportoLavorativoOptions}
                            lavoriAccettabili={
                              jobSearchDraft.check_lavori_accettabili
                            }
                            lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                            disponibilitaNelGiorno={
                              availabilityDraft.disponibilita_nel_giorno
                            }
                            disponibilitaNelGiornoOptions={
                              disponibilitaNelGiornoOptions
                            }
                            onTipoRapportoChange={(values) => {
                              setJobSearchDraft((current) => ({
                                ...current,
                                tipo_rapporto_lavorativo: values,
                              }));
                              void patchSelectedWorkerField(
                                "tipo_rapporto_lavorativo",
                                values.length > 0 ? values : null,
                              );
                            }}
                            onLavoriAccettabiliChange={(values) => {
                              setJobSearchDraft((current) => ({
                                ...current,
                                check_lavori_accettabili: values,
                              }));
                              void patchSelectedWorkerField(
                                "check_lavori_accettabili",
                                values.length > 0 ? values : null,
                              );
                            }}
                            onDisponibilitaNelGiornoChange={(values) => {
                              setAvailabilityDraft((current) => ({
                                ...current,
                                disponibilita_nel_giorno: values,
                              }));
                              void patchSelectedWorkerField(
                                "disponibilita_nel_giorno",
                                values.length > 0 ? values : null,
                              );
                            }}
                          />
                          <AvailabilityCalendarCard
                            titleMeta={
                              formatAvailabilityComputedAt(
                                availabilityPayload?.computed_at,
                              ) ?? "-"
                            }
                            isEditing={gateAvailabilityCalendarIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            isUpdating={updatingAvailability}
                            editDays={AVAILABILITY_EDIT_DAYS.map(
                              ({ field, label }) => ({ field, label }),
                            )}
                            editBands={AVAILABILITY_EDIT_BANDS.map(
                              ({ field, label }) => ({ field, label }),
                            )}
                            hourLabels={AVAILABILITY_HOUR_LABELS}
                            readOnlyRows={availabilityReadOnlyRows}
                            matrix={availabilityDraft.matrix}
                            vincoliOrari={
                              availabilityDraft.vincoli_orari_disponibilita
                            }
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            onMatrixChange={(dayField, bandField, checked) =>
                              void handleAvailabilityMatrixChange(
                                dayField as AvailabilityEditDayField,
                                bandField as AvailabilityEditBandField,
                                checked,
                              )
                            }
                            onVincoliChange={(value) =>
                              setAvailabilityDraft((current) => ({
                                ...current,
                                vincoli_orari_disponibilita: value,
                              }))
                            }
                            onVincoliSave={async (value) => {
                              setAvailabilityDraft((current) => ({
                                ...current,
                                vincoli_orari_disponibilita: value,
                              }))
                              await patchSelectedWorkerField(
                                "vincoli_orari_disponibilita",
                                value.trim() || null,
                              )
                            }}
                            vincoliIdentity={selectedWorkerId}
                            onSave={() => void saveWorkerAvailability()}
                          />
                        </GateStepSection>
                      </div>

                      <div
                        className={
                          useGate1ReorderedSteps
                            ? getGateSectionOrderClass(bazeChecksStep ?? 0)
                            : "pt-6"
                        }
                        ref={(node) => {
                          if (useGate1ReorderedSteps) {
                            sectionRefs.current.check_baze = node;
                          }
                        }}
                      >
                        <GateStepSection
                          step={bazeChecksStep ?? 0}
                          showStepper={showStepper}
                          info={stepInfoBySection.check_baze}
                        >
                          <GateBazeChecksCard
                            isEditing={gateBazeChecksIsEditing}
                            showEditAction={bazeChecksEditMode === "toggle"}
                            onToggleEdit={() =>
                              setIsEditingBazeChecks((current) => !current)
                            }
                            funzionamentoBaze={
                              gateDraft.checkAccettaFunzionamentoBaze
                            }
                            funzionamentoBazeOptions={funzionamentoBazeOptions}
                            paga9={gateDraft.checkAccettaPaga9EuroNetti}
                            paga9Options={paga9Options}
                            pagaOrariaRichiesta={pagaOrariaRichiestaValue}
                            multipliContratti={
                              gateDraft.checkAccettaMultipliContratti
                            }
                            multipliContrattiOptions={multipliContrattiOptions}
                            dataScadenzaNaspi={dataScadenzaNaspiGateValue}
                            lookupColorsByDomain={lookupColorsByDomain}
                            onFunzionamentoBazeChange={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaFunzionamentoBaze: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_funzionamento_baze",
                                value || null,
                              );
                            }}
                            onPaga9Change={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaPaga9EuroNetti: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_paga_9_euro_netti",
                                value || null,
                              );
                            }}
                            onPagaOrariaRichiestaChange={(value) => {
                              pagaCtrl.field.onChange(value);
                            }}
                            onMultipliContrattiChange={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaMultipliContratti: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_multipli_contratti",
                                value || null,
                              );
                            }}
                            onDataScadenzaNaspiChange={(value) => {
                              naspiWorkerCtrl.field.onChange(value);
                            }}
                          />
                        </GateStepSection>
                      </div>
                    </>
                  ) : (
                    <GateStepSection
                      step={disponibilitaStep}
                      showStepper={showStepper}
                      info={stepInfoBySection.disponibilita}
                    >
                      <GateBazeChecksCard
                        isEditing={gateBazeChecksIsEditing}
                        showEditAction={bazeChecksEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingBazeChecks((current) => !current)
                        }
                        funzionamentoBaze={
                          gateDraft.checkAccettaFunzionamentoBaze
                        }
                        funzionamentoBazeOptions={funzionamentoBazeOptions}
                        paga9={gateDraft.checkAccettaPaga9EuroNetti}
                        paga9Options={paga9Options}
                        pagaOrariaRichiesta={pagaOrariaRichiestaValue}
                        multipliContratti={
                          gateDraft.checkAccettaMultipliContratti
                        }
                        multipliContrattiOptions={multipliContrattiOptions}
                        dataScadenzaNaspi={dataScadenzaNaspiGateValue}
                        lookupColorsByDomain={lookupColorsByDomain}
                        onFunzionamentoBazeChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaFunzionamentoBaze: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_funzionamento_baze",
                            value || null,
                          );
                        }}
                        onPaga9Change={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaPaga9EuroNetti: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_paga_9_euro_netti",
                            value || null,
                          );
                        }}
                        onPagaOrariaRichiestaChange={(value) => {
                          pagaCtrl.field.onChange(value);
                        }}
                        onMultipliContrattiChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaMultipliContratti: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_multipli_contratti",
                            value || null,
                          );
                        }}
                        onDataScadenzaNaspiChange={(value) => {
                          naspiWorkerCtrl.field.onChange(value);
                        }}
                      />
                      <GateShiftPreferencesCard
                        isEditing={gateShiftPreferencesIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        lookupColorsByDomain={lookupColorsByDomain}
                        tipoRapportoLavorativo={
                          jobSearchDraft.tipo_rapporto_lavorativo
                        }
                        tipoRapportoOptions={tipoRapportoLavorativoOptions}
                        lavoriAccettabili={
                          jobSearchDraft.check_lavori_accettabili
                        }
                        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                        disponibilitaNelGiorno={
                          availabilityDraft.disponibilita_nel_giorno
                        }
                        disponibilitaNelGiornoOptions={
                          disponibilitaNelGiornoOptions
                        }
                        onTipoRapportoChange={(values) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            tipo_rapporto_lavorativo: values,
                          }));
                          void patchSelectedWorkerField(
                            "tipo_rapporto_lavorativo",
                            values.length > 0 ? values : null,
                          );
                        }}
                        onLavoriAccettabiliChange={(values) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            check_lavori_accettabili: values,
                          }));
                          void patchSelectedWorkerField(
                            "check_lavori_accettabili",
                            values.length > 0 ? values : null,
                          );
                        }}
                        onDisponibilitaNelGiornoChange={(values) => {
                          setAvailabilityDraft((current) => ({
                            ...current,
                            disponibilita_nel_giorno: values,
                          }));
                          void patchSelectedWorkerField(
                            "disponibilita_nel_giorno",
                            values.length > 0 ? values : null,
                          );
                        }}
                      />
                      <AvailabilityStatusCard
                        isEditing={gateAvailabilityStatusIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        isUpdating={updatingAvailabilityStatus}
                        disponibilitaOptions={disponibilitaLookupOptions}
                        draft={availabilityStatusDraft}
                        selectedDisponibilita={asString(
                          selectedWorkerRow.disponibilita,
                        )}
                        selectedDisponibilitaBadgeClassName={
                          disponibilitaBadgeClassName
                        }
                        selectedDataRitorno={asString(
                          selectedWorkerRow.data_ritorno_disponibilita,
                        )}
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        onDisponibilitaChange={(value) => {
                          setAvailabilityStatusDraft((current) => ({
                            ...current,
                            disponibilita: value,
                          }));
                          void patchWorkerAvailabilityStatus({
                            disponibilita: value || null,
                          });
                        }}
                        onDataRitornoChange={(value) => {
                          setAvailabilityStatusDraft((current) => ({
                            ...current,
                            data_ritorno_disponibilita: value,
                          }));
                          void patchWorkerAvailabilityStatus({
                            data_ritorno_disponibilita: value || null,
                          });
                        }}
                        onDataRitornoBlur={() => undefined}
                      />
                      <AvailabilityCalendarCard
                        titleMeta={
                          formatAvailabilityComputedAt(
                            availabilityPayload?.computed_at,
                          ) ?? "-"
                        }
                        isEditing={gateAvailabilityCalendarIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        isUpdating={updatingAvailability}
                        editDays={AVAILABILITY_EDIT_DAYS.map(
                          ({ field, label }) => ({ field, label }),
                        )}
                        editBands={AVAILABILITY_EDIT_BANDS.map(
                          ({ field, label }) => ({ field, label }),
                        )}
                        hourLabels={AVAILABILITY_HOUR_LABELS}
                        readOnlyRows={availabilityReadOnlyRows}
                        matrix={availabilityDraft.matrix}
                        vincoliOrari={
                          availabilityDraft.vincoli_orari_disponibilita
                        }
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        onMatrixChange={(dayField, bandField, checked) =>
                          void handleAvailabilityMatrixChange(
                            dayField as AvailabilityEditDayField,
                            bandField as AvailabilityEditBandField,
                            checked,
                          )
                        }
                        onVincoliChange={(value) =>
                          setAvailabilityDraft((current) => ({
                            ...current,
                            vincoli_orari_disponibilita: value,
                          }))
                        }
                        onVincoliSave={async (value) => {
                          setAvailabilityDraft((current) => ({
                            ...current,
                            vincoli_orari_disponibilita: value,
                          }))
                          await patchSelectedWorkerField(
                            "vincoli_orari_disponibilita",
                            value.trim() || null,
                          )
                        }}
                        vincoliIdentity={selectedWorkerId}
                        onSave={() => void saveWorkerAvailability()}
                      />
                    </GateStepSection>
                  )}
                </div>

                <div
                  className={getGateSectionOrderClass(aspettiStep)}
                  ref={(node) => {
                    sectionRefs.current.aspetti = node;
                  }}
                >
                  <GateStepSection
                    step={aspettiStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.aspetti}
                  >
                    {specificChecksMode === "confirmation" ? (
                      <>
                        <GateSpecificChecksCard
                          mobilityValue={
                            useGate1ReorderedSteps
                              ? readArrayStrings(selectedWorkerRow.come_ti_sposti)
                              : undefined
                          }
                          mobilityOptions={
                            useGate1ReorderedSteps
                              ? mobilityLookupOptions
                              : undefined
                          }
                          mobilityAnchor={
                            useGate1ReorderedSteps
                              ? addressMobilityAnchor
                              : undefined
                          }
                          isUpdatingMobility={updatingNonQualificato}
                          isBabysitterEnabled={includesBabysitterType(
                            jobSearchDraft.tipo_lavoro_domestico,
                            tipoLavoroDomesticoOptions,
                          )}
                          neonatiValue={
                            skillsDraft.check_accetta_babysitting_neonati
                          }
                          neonatiOptions={babysittingNeonatiOptions}
                          multipliBambiniValue={
                            skillsDraft.check_accetta_babysitting_multipli_bambini
                          }
                          multipliBambiniOptions={
                            babysittingMultipliBambiniOptions
                          }
                          caniValue={skillsDraft.check_accetta_case_con_cani}
                          caniOptions={caseConCaniOptions}
                          caniGrandiValue={
                            skillsDraft.check_accetta_case_con_cani_grandi
                          }
                          caniGrandiOptions={caseConCaniGrandiOptions}
                          gattiValue={skillsDraft.check_accetta_case_con_gatti}
                          gattiOptions={caseConGattiOptions}
                          scaleValue={
                            skillsDraft.check_accetta_salire_scale_o_soffitti_alti
                          }
                          scaleOptions={scaleSoffittiOptions}
                          trasfertaValue={
                            jobSearchDraft.check_accetta_lavori_con_trasferta
                          }
                          trasfertaOptions={trasfertaOptions}
                          lookupColorsByDomain={lookupColorsByDomain}
                          onMobilityChange={
                            useGate1ReorderedSteps
                              ? (values) => {
                                  setAddressDraft((current) => ({
                                    ...current,
                                    come_ti_sposti: values,
                                  }));
                                  void patchSelectedWorkerField(
                                    "come_ti_sposti",
                                    values.length > 0 ? values : null,
                                  );
                                }
                              : undefined
                          }
                          onNeonatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_babysitting_neonati: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_babysitting_neonati",
                              value,
                            );
                          }}
                          onMultipliBambiniChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_babysitting_multipli_bambini: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_babysitting_multipli_bambini",
                              value,
                            );
                          }}
                          onCaniChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_cani: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_cani",
                              value,
                            );
                          }}
                          onCaniGrandiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_cani_grandi: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_cani_grandi",
                              value,
                            );
                          }}
                          onGattiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_gatti: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_gatti",
                              value,
                            );
                          }}
                          onScaleChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_salire_scale_o_soffitti_alti: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_salire_scale_o_soffitti_alti",
                              value,
                            );
                          }}
                          onTrasfertaChange={(value) => {
                            setJobSearchDraft((current) => ({
                              ...current,
                              check_accetta_lavori_con_trasferta: value,
                            }));
                            void patchSelectedWorkerField(
                              "check_accetta_lavori_con_trasferta",
                              value || null,
                            );
                          }}
                        />
                        <GateSkillConfirmationsCard
                          isEditing={gateSpecificChecksIsEditing}
                          showEditAction={specificChecksEditMode === "toggle"}
                          onToggleEdit={() =>
                            setIsEditingSkills((current) => !current)
                          }
                          isUpdating={updatingSkills}
                          lookupColorsByDomain={lookupColorsByDomain}
                          livelloItalianoValue={gateDraft.livelloItaliano}
                          livelloItalianoOptions={livelloItalianoOptions}
                          onLivelloItalianoChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              livelloItaliano: value,
                            }));
                            void patchSelectedWorkerField(
                              "livello_italiano",
                              value || null,
                            );
                          }}
                          livelloIngleseValue={skillsDraft.livello_inglese}
                          livelloIngleseOptions={livelloIngleseOptions}
                          onLivelloIngleseChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_inglese: value,
                            }));
                            void patchSkillsField("livello_inglese", value);
                          }}
                          livelloCucinaValue={skillsDraft.livello_cucina}
                          livelloCucinaOptions={livelloCucinaOptions}
                          onLivelloCucinaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_cucina: value,
                            }));
                            void patchSkillsField("livello_cucina", value);
                          }}
                          livelloStiroValue={skillsDraft.livello_stiro}
                          livelloStiroOptions={livelloStiroOptions}
                          onLivelloStiroChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_stiro: value,
                            }));
                            void patchSkillsField("livello_stiro", value);
                          }}
                          livelloPulizieValue={skillsDraft.livello_pulizie}
                          livelloPulizieOptions={livelloPulizieOptions}
                          onLivelloPulizieChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_pulizie: value,
                            }));
                            void patchSkillsField("livello_pulizie", value);
                          }}
                          livelloBabysittingValue={
                            skillsDraft.livello_babysitting
                          }
                          livelloBabysittingOptions={livelloBabysittingOptions}
                          onLivelloBabysittingChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_babysitting: value,
                            }));
                            void patchSkillsField("livello_babysitting", value);
                          }}
                          livelloDogsittingValue={
                            skillsDraft.livello_dogsitting
                          }
                          livelloDogsittingOptions={livelloDogsittingOptions}
                          onLivelloDogsittingChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_dogsitting: value,
                            }));
                            void patchSkillsField("livello_dogsitting", value);
                          }}
                          livelloGiardinaggioValue={
                            skillsDraft.livello_giardinaggio
                          }
                          livelloGiardinaggioOptions={
                            livelloGiardinaggioOptions
                          }
                          onLivelloGiardinaggioChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_giardinaggio: value,
                            }));
                            void patchSkillsField(
                              "livello_giardinaggio",
                              value,
                            );
                          }}
                          compatibilitaStiroValue={
                            skillsDraft.compatibilita_con_stiro_esigente
                          }
                          compatibilitaStiroOptions={compatibilitaStiroOptions}
                          onCompatibilitaStiroChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_stiro_esigente: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_stiro_esigente",
                              value,
                            );
                          }}
                          compatibilitaCucinaValue={
                            skillsDraft.compatibilita_con_cucina_strutturata
                          }
                          compatibilitaCucinaOptions={
                            compatibilitaCucinaOptions
                          }
                          onCompatibilitaCucinaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_cucina_strutturata: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_cucina_strutturata",
                              value,
                            );
                          }}
                          compatibilitaNeonatiValue={
                            skillsDraft.compatibilita_babysitting_neonati
                          }
                          compatibilitaNeonatiOptions={
                            compatibilitaNeonatiOptions
                          }
                          onCompatibilitaNeonatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_babysitting_neonati: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_babysitting_neonati",
                              value,
                            );
                          }}
                          ratingAtteggiamentoValue={
                            gateDraft.ratingAtteggiamento
                          }
                          onRatingAtteggiamentoChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingAtteggiamento: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_atteggiamento",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCuraPersonaleValue={
                            gateDraft.ratingCuraPersonale
                          }
                          onRatingCuraPersonaleChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCuraPersonale: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_cura_personale",
                              parseNumberValue(value),
                            );
                          }}
                          ratingPrecisionePuntualitaValue={
                            gateDraft.ratingPrecisionePuntualita
                          }
                          onRatingPrecisionePuntualitaChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingPrecisionePuntualita: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_precisione_puntualita",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCapacitaComunicativeValue={
                            gateDraft.ratingCapacitaComunicative
                          }
                          onRatingCapacitaComunicativeChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCapacitaComunicative: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_capacita_comunicative",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCorporaturaValue={gateDraft.ratingCorporatura}
                          ratingCorporaturaOptions={ratingCorporaturaOptions}
                          onRatingCorporaturaChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCorporatura: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_corporatura",
                              value || null,
                            );
                          }}
                          compatibilitaFamiglieNumeroseValue={
                            skillsDraft.compatibilita_famiglie_numerose
                          }
                          compatibilitaFamiglieNumeroseOptions={
                            compatibilitaFamiglieNumeroseOptions
                          }
                          onCompatibilitaFamiglieNumeroseChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_famiglie_numerose: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_famiglie_numerose",
                              value,
                            );
                          }}
                          compatibilitaFamiglieMoltoEsigentiValue={
                            skillsDraft.compatibilita_famiglie_molto_esigenti
                          }
                          compatibilitaFamiglieMoltoEsigentiOptions={
                            compatibilitaFamiglieMoltoEsigentiOptions
                          }
                          onCompatibilitaFamiglieMoltoEsigentiChange={(
                            value,
                          ) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_famiglie_molto_esigenti: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_famiglie_molto_esigenti",
                              value,
                            );
                          }}
                          compatibilitaDatorePresenteValue={
                            skillsDraft.compatibilita_lavoro_con_datore_presente_in_casa
                          }
                          compatibilitaDatorePresenteOptions={
                            compatibilitaDatorePresenteOptions
                          }
                          onCompatibilitaDatorePresenteChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_lavoro_con_datore_presente_in_casa:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_lavoro_con_datore_presente_in_casa",
                              value,
                            );
                          }}
                          compatibilitaCaseGrandiValue={
                            skillsDraft.compatibilita_con_case_di_grandi_dimensioni
                          }
                          compatibilitaCaseGrandiOptions={
                            compatibilitaCaseGrandiOptions
                          }
                          onCompatibilitaCaseGrandiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_case_di_grandi_dimensioni:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_case_di_grandi_dimensioni",
                              value,
                            );
                          }}
                          compatibilitaAnimaliValue={
                            skillsDraft.compatibilita_con_animali_in_casa
                          }
                          compatibilitaAnimaliOptions={
                            compatibilitaAnimaliOptions
                          }
                          onCompatibilitaAnimaliChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_animali_in_casa: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_animali_in_casa",
                              value,
                            );
                          }}
                          compatibilitaAutonomiaValue={
                            skillsDraft.compatibilita_con_elevata_autonomia_richiesta
                          }
                          compatibilitaAutonomiaOptions={
                            compatibilitaAutonomiaOptions
                          }
                          onCompatibilitaAutonomiaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_elevata_autonomia_richiesta:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_elevata_autonomia_richiesta",
                              value,
                            );
                          }}
                          compatibilitaContestiPacatiValue={
                            skillsDraft.compatibilita_con_contesti_pacati
                          }
                          compatibilitaContestiPacatiOptions={
                            compatibilitaContestiPacatiOptions
                          }
                          onCompatibilitaContestiPacatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_contesti_pacati: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_contesti_pacati",
                              value,
                            );
                          }}
                        />
                      </>
                    ) : (
                      <GateSpecificChecksCard
                        mobilityValue={
                          useGate1ReorderedSteps
                            ? readArrayStrings(selectedWorkerRow.come_ti_sposti)
                            : undefined
                        }
                        mobilityOptions={
                          useGate1ReorderedSteps
                            ? mobilityLookupOptions
                            : undefined
                        }
                        mobilityAnchor={
                          useGate1ReorderedSteps
                            ? addressMobilityAnchor
                            : undefined
                        }
                        isUpdatingMobility={updatingNonQualificato}
                        isBabysitterEnabled={includesBabysitterType(
                          jobSearchDraft.tipo_lavoro_domestico,
                          tipoLavoroDomesticoOptions,
                        )}
                        neonatiValue={
                          skillsDraft.check_accetta_babysitting_neonati
                        }
                        neonatiOptions={babysittingNeonatiOptions}
                        multipliBambiniValue={
                          skillsDraft.check_accetta_babysitting_multipli_bambini
                        }
                        multipliBambiniOptions={
                          babysittingMultipliBambiniOptions
                        }
                        caniValue={skillsDraft.check_accetta_case_con_cani}
                        caniOptions={caseConCaniOptions}
                        caniGrandiValue={
                          skillsDraft.check_accetta_case_con_cani_grandi
                        }
                        caniGrandiOptions={caseConCaniGrandiOptions}
                        gattiValue={skillsDraft.check_accetta_case_con_gatti}
                        gattiOptions={caseConGattiOptions}
                        scaleValue={
                          skillsDraft.check_accetta_salire_scale_o_soffitti_alti
                        }
                        scaleOptions={scaleSoffittiOptions}
                        trasfertaValue={
                          jobSearchDraft.check_accetta_lavori_con_trasferta
                        }
                        trasfertaOptions={trasfertaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                        onMobilityChange={
                          useGate1ReorderedSteps
                            ? (values) => {
                                setAddressDraft((current) => ({
                                  ...current,
                                  come_ti_sposti: values,
                                }));
                                void patchSelectedWorkerField(
                                  "come_ti_sposti",
                                  values.length > 0 ? values : null,
                                );
                              }
                            : undefined
                        }
                        onNeonatiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_babysitting_neonati: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_babysitting_neonati",
                            value,
                          );
                        }}
                        onMultipliBambiniChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_babysitting_multipli_bambini: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_babysitting_multipli_bambini",
                            value,
                          );
                        }}
                        onCaniChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_cani: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_cani",
                            value,
                          );
                        }}
                        onCaniGrandiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_cani_grandi: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_cani_grandi",
                            value,
                          );
                        }}
                        onGattiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_gatti: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_gatti",
                            value,
                          );
                        }}
                        onScaleChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_salire_scale_o_soffitti_alti: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_salire_scale_o_soffitti_alti",
                            value,
                          );
                        }}
                        onTrasfertaChange={(value) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            check_accetta_lavori_con_trasferta: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_lavori_con_trasferta",
                            value || null,
                          );
                        }}
                      />
                    )}
                  </GateStepSection>
                </div>

                {showDocumentSection && documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.documenti = node;
                    }}
                  >
                    <GateStepSection
                      step={documentiStep ?? 0}
                      isLast={!showAssessment}
                      showStepper={showStepper}
                      info={stepInfoBySection.documenti}
                    >
                      <DocumentsCard
                        workerId={selectedWorkerId}
                        isEditing={gateDocumentsIsEditing}
                        showEditAction={false}
                        isUpdating={updatingDocuments}
                        draft={documentsDraft}
                        selectedValues={{
                          stato_verifica_documenti: asString(
                            selectedWorkerRow?.stato_verifica_documenti,
                          ),
                          documenti_in_regola: asString(
                            selectedWorkerRow?.documenti_in_regola,
                          ),
                          data_scadenza_naspi: naspiDocValue,
                        }}
                        documents={selectedWorkerDocuments}
                        documentsLoading={loadingSelectedWorkerDocuments}
                        verificationOptions={documentiVerificatiOptions}
                        statoDocumentiOptions={documentiInRegolaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                        showAdministrativeData={!showAdministrativeFields}
                        onToggleEdit={() =>
                          setIsEditingDocuments((current) => !current)
                        }
                        onVerificationChange={(value) => {
                          setDocumentsDraft((current) => ({
                            ...current,
                            stato_verifica_documenti: value,
                          }));
                          void patchDocumentField(
                            "stato_verifica_documenti",
                            value || null,
                          );
                        }}
                        onStatoDocumentiChange={(value) => {
                          setDocumentsDraft((current) => ({
                            ...current,
                            documenti_in_regola: value,
                          }));
                          void patchDocumentField(
                            "documenti_in_regola",
                            value || null,
                          );
                        }}
                        onNaspiChange={(value) => {
                          naspiDocCtrl.field.onChange(value);
                        }}
                        onDocumentUpsert={upsertSelectedWorkerDocument}
                        onUploadError={setError}
                      />
                      <GateDocumentIdentityCard
                        headerDraft={{
                          nome: headerNomeValue,
                          cognome: headerCognomeValue,
                          nazionalita: headerDraft.nazionalita,
                          data_di_nascita: headerDataNascitaValue,
                        }}
                        nazionalitaOptions={nazionalitaLookupOptions}
                        isEditing={true}
                        onHeaderChange={(field, value) => {
                          if (field === "nome") nomeCtrl.field.onChange(value);
                          else if (field === "cognome") cognomeCtrl.field.onChange(value);
                          else if (field === "data_di_nascita") dataNascitaCtrl.field.onChange(value);
                          else if (field === "nazionalita") {
                            setHeaderDraft((current) => ({ ...current, nazionalita: value }));
                            void patchSelectedWorkerField("nazionalita", value || null);
                          }
                        }}
                      />
                      {showAdministrativeFields ? (
                        <GateAdministrativeFieldsCard
                          ibanValue={ibanValue}
                          stripeAccountValue={documentsDraft.id_stripe_account}
                          isEditing={
                            showAdministrativeFields || gateDocumentsIsEditing
                          }
                          isUpdating={updatingDocuments}
                          missingStripeRequirements={getStripeAccountMissingRequirements({
                            worker: selectedWorkerRow,
                            address: selectedWorkerAddress,
                            iban: ibanValue,
                          })}
                          onIbanChange={(value) => {
                            ibanCtrl.field.onChange(value);
                          }}
                          onGenerateStripeAccount={generateStripeAccount}
                        />
                      ) : null}
                    </GateStepSection>
                  </div>
                ) : null}

                {showAssessment ? (
                  <div
                    className={getGateSectionOrderClass(assessmentStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.assessment = node;
                    }}
                  >
                    <GateStepSection
                      step={assessmentStep ?? 0}
                      isLast
                      showStepper={showStepper}
                      info={stepInfoBySection.assessment}
                    >
                      <GateAssessmentCard
                        key={selectedWorkerId}
                        statusValue={gateDraft.assessmentStatus}
                        statusOptions={statoLavoratoreOptions}
                        onStatusChange={(value) => {
                          if (selectedWorkerId) {
                            retainSelectedWorkerAfterStatusChange(
                              selectedWorkerId,
                            );
                          }
                          setGateDraft((current) => ({
                            ...current,
                            assessmentStatus: value,
                          }));
                          void patchSelectedWorkerField(
                            "stato_lavoratore",
                            value || null,
                          );
                        }}
                        nonIdoneoReasonValue={nonIdoneoReasonValues[0] ?? ""}
                        nonIdoneoReasonOptions={motivazioniNonIdoneoOptions}
                        onNonIdoneoReasonChange={(value) => {
                          void handleNonIdoneoReasonsChange(
                            value ? [value] : [],
                          );
                        }}
                        feedbackRaw={asString(selectedWorkerRow?.feedback_recruiter)}
                        operatorName={operatorName}
                        onFeedbackSave={(next) =>
                          patchSelectedWorkerField(
                            "feedback_recruiter",
                            next.trim() || null,
                          )
                        }
                        lookupColorsByDomain={lookupColorsByDomain}
                      />
                    </GateStepSection>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedWorkerId ? (
              <RecruiterFeedbackButton
                value={asString(selectedWorkerRow?.feedback_recruiter)}
                operatorName={operatorName}
                onSave={(next) =>
                  patchSelectedWorkerField(
                    "feedback_recruiter",
                    next.trim() || null,
                  )
                }
              />
            ) : null}
          </WorkerDetailShell>
        ) : null}
      </div>
    </section>
    </Gate1WorkerProvider>
  );
}
