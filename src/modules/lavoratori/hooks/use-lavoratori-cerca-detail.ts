import * as React from "react"
import { useController } from "react-hook-form"
import { toast } from "sonner"
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  FolderArchiveIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  SirenIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

import { useSelectedWorkerEditor } from "./use-selected-worker-editor"
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { useProvincieOptions } from "@/hooks/use-provincie"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { useComboboxAnchor } from "@/components/ui/combobox"
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  readArrayStrings,
} from "../lib/base-utils"
import { isDirectInvolvementSelection } from "../lib/involvement-utils"
import { sortSelectionGroupsByRank } from "../lib/stati-selezione"
import {
  getTagClassName,
  resolveLookupColor,
} from "../lib/lookup-utils"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { fetchLavoratoriByIds } from "../queries/fetch-lavoratori-by-ids"
import { fetchSelezioniLookup } from "@/modules/ricerca/queries"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { invokeAiGenerationFunction } from "@/lib/ai-generation"
import { supabase } from "@/lib/supabase-client"
import type { OpenRicercaDetailOptions } from "@/routes/app-routes"
import type { LavoratoreListItem } from "../components/lavoratore-card"
import {
  formatRelatedFamilyName,
  formatRelatedSearchLabel,
  formatRelatedZona,
  getFirstLookupArrayValue,
  getLookupArrayValues,
  sanitizeFileName,
  searchProcessesForWorkerAdd,
  type SearchProcessResult,
  type WorkerRelatedSearchItem,
} from "../lib/cerca-utils"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LeadDetailFormDraft,
  LavoratoreRecord,
  NonQualificatoFormDraft,
  ReferenzaLavoratoreRecord,
} from "../types"
import type { LookupOption } from "../lib/lookup-utils"
import type { LavoratoriCercaDetailPanelProps } from "../components/lavoratori-cerca-detail-panel"

type WorkerSectionTab = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export type UseLavoratoriCercaDetailParams = {
  onOpenRicercaDetail?: (processId: string, options?: OpenRicercaDetailOptions) => void
  selectedWorkerId: string | null
  selectedWorker: LavoratoreListItem | null
  selectedWorkerRow: LavoratoreRecord | null
  selectedWorkerAddress: Record<string, unknown> | null
  selectedWorkerDocuments: DocumentoLavoratoreRecord[]
  loadingSelectedWorkerDocuments: boolean
  selectedWorkerExperiences: EsperienzaLavoratoreRecord[]
  loadingSelectedWorkerExperiences: boolean
  selectedWorkerReferences: ReferenzaLavoratoreRecord[]
  loadingSelectedWorkerReferences: boolean
  setError: React.Dispatch<React.SetStateAction<string | null>>
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void
  applyUpdatedWorkerAddress: (row: Record<string, unknown>) => void
  applyUpdatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  appendCreatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  removeWorkerExperience: (experienceId: string) => void
  applyUpdatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  appendCreatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  upsertSelectedWorkerDocument: (row: DocumentoLavoratoreRecord) => void
  selectedWorkerRelatedSearches: Record<string, unknown>[]
  reloadSelectedWorkerScheda: () => void
}

export function useLavoratoriCercaDetail({
  onOpenRicercaDetail,
  selectedWorkerId,
  selectedWorker,
  selectedWorkerRow,
  selectedWorkerAddress,
  selectedWorkerDocuments,
  loadingSelectedWorkerDocuments,
  selectedWorkerExperiences,
  loadingSelectedWorkerExperiences,
  selectedWorkerReferences,
  loadingSelectedWorkerReferences,
  setError,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  applyUpdatedWorkerRow,
  applyUpdatedWorkerAddress,
  applyUpdatedWorkerExperience,
  appendCreatedWorkerExperience,
  removeWorkerExperience,
  applyUpdatedWorkerReference,
  appendCreatedWorkerReference,
  upsertSelectedWorkerDocument,
  selectedWorkerRelatedSearches,
  reloadSelectedWorkerScheda,
}: UseLavoratoriCercaDetailParams) {
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const addressMobilityAnchor = useComboboxAnchor();
  const workerPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [uploadingWorkerPhoto, setUploadingWorkerPhoto] = React.useState(false);
  const [generatingWorkerSummary, setGeneratingWorkerSummary] =
    React.useState(false);
  const [isAddSearchDialogOpen, setIsAddSearchDialogOpen] =
    React.useState(false);
  const [searchProcessQuery, setSearchProcessQuery] = React.useState("");
  const [searchProcessResults, setSearchProcessResults] = React.useState<
    SearchProcessResult[]
  >([]);
  const [isSearchProcessLoading, setIsSearchProcessLoading] =
    React.useState(false);
  const [selectedSearchToAdd, setSelectedSearchToAdd] =
    React.useState<SearchProcessResult | null>(null);
  const [manualSearchInsertReason, setManualSearchInsertReason] =
    React.useState("");
  const [isSubmittingAddSearch, setIsSubmittingAddSearch] =
    React.useState(false);
  const [relatedActiveSearches, setRelatedActiveSearches] = React.useState<
    { direct: WorkerRelatedSearchItem[]; other: WorkerRelatedSearchItem[] }
  >({ direct: [], other: [] });
  const [loadingRelatedActiveSearches, setLoadingRelatedActiveSearches] =
    React.useState(false);
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter_ricerca_e_selezione",
    activeOnly: true,
  });
  const groupedDirectRelatedSearches = React.useMemo(() => {
    const groups = new Map<string, WorkerRelatedSearchItem[]>();

    for (const item of relatedActiveSearches.direct) {
      const groupKey = item.statoSelezione || "Senza stato";
      const currentItems = groups.get(groupKey) ?? [];
      currentItems.push(item);
      groups.set(groupKey, currentItems);
    }

    return sortSelectionGroupsByRank(Array.from(groups.entries()));
  }, [relatedActiveSearches.direct]);
  const groupedOtherRelatedSearches = React.useMemo(() => {
    const groups = new Map<string, WorkerRelatedSearchItem[]>();

    for (const item of relatedActiveSearches.other) {
      const groupKey = item.statoSelezione || "Senza stato";
      const currentItems = groups.get(groupKey) ?? [];
      currentItems.push(item);
      groups.set(groupKey, currentItems);
    }

    return sortSelectionGroupsByRank(Array.from(groups.entries()));
  }, [relatedActiveSearches.other]);
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions],
  );
  const getSelectionStateClassName = React.useCallback(
    (value: string) =>
      getTagClassName(
        resolveLookupColor(
          lookupColorsByDomain,
          "selezioni_lavoratori.stato_selezione",
          value,
        ),
      ),
    [lookupColorsByDomain],
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
  const tipoLavoroDomesticoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.tipo_lavoro_domestico") ?? [],
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
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_rapporto") ??
      Array.from(
        new Set(
          selectedWorkerExperiences
            .map((experience) => experience.tipo_rapporto)
            .filter((value): value is string => Boolean(value)),
        ),
      ).map((value) => ({ label: value, value })),
    [lookupOptionsByDomain, selectedWorkerExperiences],
  );
  const referenceStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("referenze_lavoratori.referenza_verificata") ??
      [],
    [lookupOptionsByDomain],
  );
  const haiReferenzeOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.hai_referenze") ?? [],
    [lookupOptionsByDomain],
  );
  const documentiVerificatiOptions = React.useMemo(() => {
    return (
      lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? []
    );
  }, [lookupOptionsByDomain]);
  const documentiInRegolaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ?? [],
    [lookupOptionsByDomain],
  );
  const sessoLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.sesso") ?? [],
    [lookupOptionsByDomain],
  );
  const nazionalitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.nazionalita") ?? [],
    [lookupOptionsByDomain],
  );
  const statoLavoratoreLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ?? [],
    [lookupOptionsByDomain],
  );
  const provinciaLookupOptions = useProvincieOptions();
  const disponibilitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.disponibilita") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoRapportoLavorativoOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.tipo_rapporto_lavorativo") ?? [];
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.label)) return false;
      seen.add(option.label);
      return true;
    });
  }, [lookupOptionsByDomain]);
  const lavoriAccettabiliOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.check_lavori_accettabili") ?? [];
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.label)) return false;
      seen.add(option.label);
      return true;
    });
  }, [lookupOptionsByDomain]);
  const trasfertaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_lavori_con_trasferta",
      ) ?? [],
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
  const selectedSkillCompetenzeValues = React.useMemo(
    () => ({
      livello_pulizie: asString(selectedWorkerRow?.livello_pulizie),
      check_accetta_salire_scale_o_soffitti_alti: asString(
        selectedWorkerRow?.check_accetta_salire_scale_o_soffitti_alti,
      ),
      compatibilita_famiglie_numerose: asString(
        selectedWorkerRow?.compatibilita_famiglie_numerose,
      ),
      compatibilita_famiglie_molto_esigenti: asString(
        selectedWorkerRow?.compatibilita_famiglie_molto_esigenti,
      ),
      compatibilita_lavoro_con_datore_presente_in_casa: asString(
        selectedWorkerRow?.compatibilita_lavoro_con_datore_presente_in_casa,
      ),
      compatibilita_con_case_di_grandi_dimensioni: asString(
        selectedWorkerRow?.compatibilita_con_case_di_grandi_dimensioni,
      ),
      compatibilita_con_elevata_autonomia_richiesta: asString(
        selectedWorkerRow?.compatibilita_con_elevata_autonomia_richiesta,
      ),
      compatibilita_con_contesti_pacati: asString(
        selectedWorkerRow?.compatibilita_con_contesti_pacati,
      ),
      livello_stiro: asString(selectedWorkerRow?.livello_stiro),
      compatibilita_con_stiro_esigente: asString(
        selectedWorkerRow?.compatibilita_con_stiro_esigente,
      ),
      livello_cucina: asString(selectedWorkerRow?.livello_cucina),
      compatibilita_con_cucina_strutturata: asString(
        selectedWorkerRow?.compatibilita_con_cucina_strutturata,
      ),
      livello_babysitting: asString(selectedWorkerRow?.livello_babysitting),
      check_accetta_babysitting_multipli_bambini: asString(
        selectedWorkerRow?.check_accetta_babysitting_multipli_bambini,
      ),
      check_accetta_babysitting_neonati: asString(
        selectedWorkerRow?.check_accetta_babysitting_neonati,
      ),
      compatibilita_babysitting_neonati: asString(
        selectedWorkerRow?.compatibilita_babysitting_neonati,
      ),
      livello_dogsitting: asString(selectedWorkerRow?.livello_dogsitting),
      check_accetta_case_con_cani: asString(
        selectedWorkerRow?.check_accetta_case_con_cani,
      ),
      check_accetta_case_con_cani_grandi: asString(
        selectedWorkerRow?.check_accetta_case_con_cani_grandi,
      ),
      check_accetta_case_con_gatti: asString(
        selectedWorkerRow?.check_accetta_case_con_gatti,
      ),
      compatibilita_con_animali_in_casa: asString(
        selectedWorkerRow?.compatibilita_con_animali_in_casa,
      ),
      livello_giardinaggio: asString(selectedWorkerRow?.livello_giardinaggio),
      livello_italiano: asString(selectedWorkerRow?.livello_italiano),
      livello_inglese: asString(selectedWorkerRow?.livello_inglese),
    }),
    [selectedWorkerRow],
  );
  const mobilityLookupOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? [];
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.label)) return false;
      seen.add(option.label);
      return true;
    });
  }, [lookupOptionsByDomain]);

  const openRicercaDetailFromWorker = React.useCallback(
    (processId: string) => {
      onOpenRicercaDetail?.(processId, { returnToWorkerId: selectedWorkerId });
    },
    [onOpenRicercaDetail, selectedWorkerId],
  );

  React.useEffect(() => {
    if (!isAddSearchDialogOpen) {
      setSearchProcessQuery("");
      setSearchProcessResults([]);
      setSelectedSearchToAdd(null);
      setManualSearchInsertReason("");
      setIsSearchProcessLoading(false);
      return;
    }

    const normalizedQuery = searchProcessQuery.trim();
    if (normalizedQuery.length < 2) {
      setSearchProcessResults([]);
      setIsSearchProcessLoading(false);
      return;
    }

    let isCancelled = false;
    setIsSearchProcessLoading(true);

    const timeoutId = window.setTimeout(() => {
      void searchProcessesForWorkerAdd(normalizedQuery)
        .then((results) => {
          if (isCancelled) return;
          setSearchProcessResults(results);
        })
        .catch(() => {
          if (isCancelled) return;
          setSearchProcessResults([]);
        })
        .finally(() => {
          if (!isCancelled) setIsSearchProcessLoading(false);
        });
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAddSearchDialogOpen, searchProcessQuery]);

  // FASE 4 BIS — "altre ricerche attive" derivate (sincrono) dalle righe già
  // joinate fornite dalla Scheda RPC (selectedWorkerRelatedSearches), invece di
  // fare 3 fetch (selezioni + processi + famiglie). Ogni riga è selezione +
  // campi processo + famiglia_nome/cognome appiattiti.
  React.useEffect(() => {
    if (!selectedWorkerId) {
      setRelatedActiveSearches({ direct: [], other: [] });
      setLoadingRelatedActiveSearches(false);
      return;
    }

    const seenProcessIds = new Set<string>();
    const nextDirectItems: WorkerRelatedSearchItem[] = [];
    const nextOtherItems: WorkerRelatedSearchItem[] = [];

    for (const selection of selectedWorkerRelatedSearches) {
      const selectionId = asString(selection.id);
      const processId = asString(selection.processo_matching_id);
      if (!selectionId || !processId) continue;
      if (seenProcessIds.has(processId)) continue;

      // La riga porta già i campi del processo: la usiamo come "processRow"
      // sostituendo l'id (qui è l'id della selezione) con il processId.
      const processRow: Record<string, unknown> = { ...selection, id: processId };
      const familyRow = {
        nome: selection.famiglia_nome,
        cognome: selection.famiglia_cognome,
      };
      const recruiterId = asString(processRow.recruiter_ricerca_e_selezione_id);
      const tipoLavoroBadges = getLookupArrayValues(processRow.tipo_lavoro);
      const tipoLavoroBadge = tipoLavoroBadges[0] ?? null;
      const tipoRapportoBadge = getFirstLookupArrayValue(processRow.tipo_rapporto);
      const nextItem: WorkerRelatedSearchItem = {
        selectionId,
        processId,
        familyName: formatRelatedFamilyName(familyRow),
        ricercaLabel: formatRelatedSearchLabel(processRow),
        recruiterLabel: recruiterId
          ? recruiterLabelsById.get(recruiterId) ?? "Recruiter non assegnato"
          : "Recruiter non assegnato",
        statoSelezione: asString(selection.stato_selezione) || "-",
        statoRicerca: asString(processRow.stato_res) || "-",
        orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
        zona: formatRelatedZona(processRow),
        appunti: asString(selection.note_selezione) || "",
        workerColloquio: {
          giorni: asString(selection.intervista_giorni_lavoro),
          orario: asString(selection.intervista_orario_e_giorni),
        },
        boardCard: {
          id: processId,
          stage: asString(processRow.stato_res) || "-",
          nomeFamiglia: formatRelatedFamilyName(familyRow),
          cognomeFamiglia: "",
          email: "-",
          telefono: "-",
          operatorId: recruiterId,
          oreSettimanali: asString(processRow.ore_settimanale) || "-",
          giorniSettimanali: asString(processRow.numero_giorni_settimanali) || "-",
          deadline: asString(processRow.deadline_mobile) || "-",
          deadlineRaw: asString(processRow.deadline_mobile),
          zona: formatRelatedZona(processRow),
          tipoLavoroBadges,
          tipoLavoroColors: Object.fromEntries(
            tipoLavoroBadges.map((tipoLavoro) => [
              tipoLavoro,
              resolveLookupColor(
                lookupColorsByDomain,
                "processi_matching.tipo_lavoro",
                tipoLavoro,
              ),
            ]),
          ),
          tipoLavoroBadge,
          tipoLavoroColor: resolveLookupColor(
            lookupColorsByDomain,
            "processi_matching.tipo_lavoro",
            tipoLavoroBadge,
          ),
          tipoRapportoBadge,
          tipoRapportoColor: resolveLookupColor(
            lookupColorsByDomain,
            "processi_matching.tipo_rapporto",
            tipoRapportoBadge,
          ),
        },
      };

      if (isDirectInvolvementSelection(selection)) {
        nextDirectItems.push(nextItem);
      } else {
        nextOtherItems.push(nextItem);
      }
      seenProcessIds.add(processId);
    }

    setRelatedActiveSearches({ direct: nextDirectItems, other: nextOtherItems });
    setLoadingRelatedActiveSearches(false);
  }, [
    lookupColorsByDomain,
    recruiterLabelsById,
    selectedWorkerId,
    selectedWorkerRelatedSearches,
  ]);
  const {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    availabilityPayload,
    availabilityReadOnlyRows,
    presentationPhotoSlots,
    nonIdoneoReasonValues,
    blacklistChecked,
    updatingNonIdoneo,
    updatingNonQualificato,
    isEditingAddress,
    setIsEditingAddress,
    isEditingAvailability,
    setIsEditingAvailability,
    isEditingJobSearch,
    setIsEditingJobSearch,
    isEditingExperience,
    setIsEditingExperience,
    isEditingSkills,
    setIsEditingSkills,
    isEditingDocuments,
    setIsEditingDocuments,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingJobSearch,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
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
    handleNonIdoneoReasonsChange,
    handleBlacklistChange,
    patchSelectedWorkerField,
    patchWorkerAddressField,
    commitAddressField,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    patchSkillsField,
    patchDocumentField,
    generateStripeAccount,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  } = useSelectedWorkerEditor({
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

  const operatorName = useCurrentOperatorName();

  // FASE 5 BIS — form autosave per i campi di dettaglio del lavoratore che
  // alimentano card presentazionali condivise (WorkerProfileHeader, esperienze,
  // documenti/amministrativi). Le card espongono `value`/`onChange`, quindi ogni
  // campo è agganciato al form via useController: `field.onChange` emette un vero
  // evento "change" -> l'autosave scatta (a differenza di setValue), niente
  // clobber sul resync realtime. onSave instrada ogni chiave cambiata alla STESSA
  // patch fn con le STESSE trasformazioni dei vecchi useDebouncedSave.
  const leadDetailForm = useAutoSaveForm<LeadDetailFormDraft>({
    defaults: {
      data_ritorno_disponibilita: asString(
        selectedWorkerRow?.data_ritorno_disponibilita,
      ),
      anni_esperienza_colf: asInputValue(
        selectedWorkerRow?.anni_esperienza_colf,
      ),
      anni_esperienza_badante: asInputValue(
        selectedWorkerRow?.anni_esperienza_badante,
      ),
      anni_esperienza_babysitter: asInputValue(
        selectedWorkerRow?.anni_esperienza_babysitter,
      ),
      situazione_lavorativa_attuale: asString(
        selectedWorkerRow?.situazione_lavorativa_attuale,
      ),
      data_scadenza_naspi: asString(selectedWorkerRow?.data_scadenza_naspi),
      iban: resolvedIban,
      id_stripe_account: asString(selectedWorkerRow?.id_stripe_account),
      riassunto_profilo_breve: asString(
        selectedWorkerRow?.riassunto_profilo_breve,
      ),
    },
    // Form vive sopra il key del detail shell: senza resetKey gli edit dirty
    // del lavoratore A restano sul B (keepDirtyValues).
    resetKey: selectedWorkerId,
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        const v = typeof rawValue === "string" ? rawValue : "";
        switch (key) {
          case "data_ritorno_disponibilita":
            await patchWorkerAvailabilityStatus({
              data_ritorno_disponibilita: v || null,
            });
            break;
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
          case "situazione_lavorativa_attuale":
            await patchSelectedWorkerField(
              "situazione_lavorativa_attuale",
              v.trim() || null,
            );
            break;
          case "data_scadenza_naspi":
            await patchDocumentField("data_scadenza_naspi", v || null);
            break;
          case "iban":
            await patchDocumentField("iban", v || null);
            break;
          case "id_stripe_account":
            await patchDocumentField("id_stripe_account", v || null);
            break;
          case "riassunto_profilo_breve":
            await patchSelectedWorkerField(
              "riassunto_profilo_breve",
              v.trim() || null,
            );
            break;
        }
      }
    },
  });
  const dataRitornoCtrl = useController({
    name: "data_ritorno_disponibilita",
    control: leadDetailForm.control,
  });
  const anniColfCtrl = useController({
    name: "anni_esperienza_colf",
    control: leadDetailForm.control,
  });
  const anniBadanteCtrl = useController({
    name: "anni_esperienza_badante",
    control: leadDetailForm.control,
  });
  const anniBabysitterCtrl = useController({
    name: "anni_esperienza_babysitter",
    control: leadDetailForm.control,
  });
  const situazioneCtrl = useController({
    name: "situazione_lavorativa_attuale",
    control: leadDetailForm.control,
  });
  const naspiCtrl = useController({
    name: "data_scadenza_naspi",
    control: leadDetailForm.control,
  });
  const ibanCtrl = useController({
    name: "iban",
    control: leadDetailForm.control,
  });
  const stripeAccountCtrl = useController({
    name: "id_stripe_account",
    control: leadDetailForm.control,
  });
  const riassuntoProfiloCtrl = useController({
    name: "riassunto_profilo_breve",
    control: leadDetailForm.control,
  });
  const dataRitornoLCVValue = dataRitornoCtrl.field.value;
  const anniEsperienzaColfValue = anniColfCtrl.field.value;
  const anniEsperienzaBadanteValue = anniBadanteCtrl.field.value;
  const anniEsperienzaBabysitterValue = anniBabysitterCtrl.field.value;
  const situazioneLavorativaAttualeValue = situazioneCtrl.field.value;
  const naspiLCVValue = naspiCtrl.field.value;
  const ibanLCVValue = ibanCtrl.field.value;
  const stripeAccountLCVValue = stripeAccountCtrl.field.value;

  // FASE 5 BIS — form autosave per il blocco "Non qualificato". I defaults sono
  // i valori server (gli stessi committedValue dei vecchi DebouncedInput/Select).
  // onSave instrada ogni chiave cambiata alla STESSA patch fn con le STESSE
  // trasformazioni dell'originale.
  const nonQualificatoForm = useAutoSaveForm<NonQualificatoFormDraft>({
    defaults: {
      descrizione_pubblica: asString(selectedWorkerRow?.descrizione_pubblica),
      provincia: asString(selectedWorkerAddress?.provincia_sigla),
      documenti_in_regola: asString(selectedWorkerRow?.documenti_in_regola),
      hai_referenze: asString(selectedWorkerRow?.hai_referenze),
      data_di_nascita: asString(selectedWorkerRow?.data_di_nascita),
      tipo_lavoro_domestico: readArrayStrings(
        selectedWorkerRow?.tipo_lavoro_domestico,
      ),
      anni_esperienza_colf: asInputValue(selectedWorkerRow?.anni_esperienza_colf),
      anni_esperienza_babysitter: asInputValue(
        selectedWorkerRow?.anni_esperienza_babysitter,
      ),
    },
    resetKey: selectedWorkerId,
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        switch (key) {
          case "descrizione_pubblica":
            await patchSelectedWorkerField(
              "descrizione_pubblica",
              (typeof rawValue === "string" ? rawValue : "") || null,
            );
            break;
          case "provincia":
            await patchWorkerAddressField(
              "provincia",
              (typeof rawValue === "string" ? rawValue : "") || null,
            );
            break;
          case "documenti_in_regola":
            await patchSelectedWorkerField(
              "documenti_in_regola",
              (typeof rawValue === "string" ? rawValue : "") || null,
            );
            break;
          case "hai_referenze":
            await patchSelectedWorkerField(
              "hai_referenze",
              (typeof rawValue === "string" ? rawValue : "") || null,
            );
            break;
          case "data_di_nascita":
            await patchSelectedWorkerField(
              "data_di_nascita",
              (typeof rawValue === "string" ? rawValue : "") || null,
            );
            break;
          case "tipo_lavoro_domestico": {
            const values = Array.isArray(rawValue) ? (rawValue as string[]) : [];
            await patchSelectedWorkerField(
              "tipo_lavoro_domestico",
              values.length > 0 ? values : null,
            );
            break;
          }
          case "anni_esperienza_colf": {
            const v = typeof rawValue === "string" ? rawValue : "";
            await patchSelectedWorkerField(
              "anni_esperienza_colf",
              v ? Number(v) : null,
            );
            break;
          }
          case "anni_esperienza_babysitter": {
            const v = typeof rawValue === "string" ? rawValue : "";
            await patchSelectedWorkerField(
              "anni_esperienza_babysitter",
              v ? Number(v) : null,
            );
            break;
          }
          default:
            break;
        }
      }
    },
  });

  const handleGenerateWorkerSummary = React.useCallback(async () => {
    if (!selectedWorkerId) return;

    setGeneratingWorkerSummary(true);
    setError(null);
    const toastId = toast.loading("Generazione riassunto esperienze...");

    try {
      await invokeAiGenerationFunction(
        "generare-lavoratore-riassunto-profilo-breve",
        { id: selectedWorkerId },
      );

      const result = await fetchLavoratoriByIds([selectedWorkerId]);
      const row = result.rows[0];
      if (row) {
        applyUpdatedWorkerRow(asLavoratoreRecord(row));
      }
      toast.success("Riassunto esperienze generato", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || "Errore generazione riassunto");
      toast.error("Errore generazione riassunto", {
        id: toastId,
        description: message,
      });
    } finally {
      setGeneratingWorkerSummary(false);
    }
  }, [applyUpdatedWorkerRow, selectedWorkerId, setError]);

  const handleAddWorkerToSearch = React.useCallback(async () => {
    const workerId = selectedWorkerId;
    const processId = selectedSearchToAdd?.processId;
    const reason = manualSearchInsertReason.trim();

    if (!workerId || !processId) {
      toast.error("Seleziona una ricerca");
      return;
    }

    if (!reason) {
      toast.error("La motivazione è obbligatoria");
      return;
    }

    setIsSubmittingAddSearch(true);
    try {
      const existingSelections = await fetchSelezioniLookup({
        processoIds: [processId],
        lavoratoreIds: [workerId],
      });

      const existingSelection = existingSelections.rows?.[0] as
        | Record<string, unknown>
        | undefined;

      if (existingSelection) {
        const currentState = asString(existingSelection.stato_selezione) || "-";
        toast.error("Questo lavoratore è già presente in questa ricerca", {
          description: `Stato attuale: ${currentState}`,
          action: onOpenRicercaDetail
            ? {
                label: "Apri ricerca",
                onClick: () => openRicercaDetailFromWorker(processId),
              }
            : undefined,
        });
        return;
      }

      await createRecord("selezioni_lavoratori", {
        processo_matching_id: processId,
        lavoratore_id: workerId,
        stato_selezione: "Prospetto",
        motivo_inserimento_manuale: reason,
        source: "manuale",
      });
      await invokeWorkerAvailabilityForIds(
        getSelectionAvailabilityWorkerIds(null, {
          processo_matching_id: processId,
          lavoratore_id: workerId,
          stato_selezione: "Prospetto",
        }),
      );

      setIsAddSearchDialogOpen(false);
      reloadSelectedWorkerScheda();
      toast.success("Lavoratore aggiunto alla ricerca in Prospetto", {
        action: onOpenRicercaDetail
          ? {
              label: "Apri ricerca",
              onClick: () => openRicercaDetailFromWorker(processId),
            }
          : undefined,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore aggiungendo il lavoratore alla ricerca",
      );
    } finally {
      setIsSubmittingAddSearch(false);
    }
  }, [
    manualSearchInsertReason,
    onOpenRicercaDetail,
    openRicercaDetailFromWorker,
    selectedSearchToAdd,
    selectedWorkerId,
  ]);

  const selectedMotivazioneValue = React.useMemo(
    () => nonIdoneoReasonValues[0] ?? "",
    [nonIdoneoReasonValues],
  );
  const selectedMotivazioneClassName = React.useMemo(() => {
    if (!selectedMotivazioneValue) return "";
    return getTagClassName(
      resolveLookupColor(
        lookupColorsByDomain,
        "lavoratori.motivazione_non_idoneo",
        selectedMotivazioneValue,
      ),
    );
  }, [lookupColorsByDomain, selectedMotivazioneValue]);
  const selectedWorkerStatusAlert = React.useMemo(() => {
    if (!selectedWorkerRow) return null;

    if (selectedWorkerIsNonIdoneo) {
      const reasonValues =
        nonIdoneoReasonValues.length > 0
          ? nonIdoneoReasonValues
          : readArrayStrings(selectedWorkerRow.motivazione_non_idoneo);
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
  const selectedWorkerBlacklistAlert = React.useMemo(() => {
    if (!blacklistChecked) return null;

    const rawValue = asString(selectedWorkerRow?.check_blacklist)
      .trim()
      .toLowerCase();
    const reasonLabel =
      rawValue && rawValue !== "blacklist"
        ? rawValue.replaceAll("_", " ")
        : "Verifica prima di proporlo ai processi attivi.";

    return {
      statusLabel: "Lavoratore in blacklist",
      reasonLabel,
    };
  }, [blacklistChecked, selectedWorkerRow]);
  const workerSectionTabs = React.useMemo<WorkerSectionTab[]>(() => {
    const tabs: WorkerSectionTab[] = [
      { id: "profilo", label: "Profilo", icon: UsersIcon },
      { id: "processi", label: "Ricerche", icon: MessageSquareTextIcon },
      { id: "residenza", label: "Residenza", icon: MapPinIcon },
      { id: "calendario", label: "Calendario", icon: CalendarDaysIcon },
      { id: "ricerca", label: "Ricerca", icon: BriefcaseBusinessIcon },
      { id: "esperienze", label: "Esperienze", icon: UsersIcon },
      { id: "competenze", label: "Competenze", icon: SparklesIcon },
      {
        id: "documenti",
        label: "Documenti e dati amministrativi",
        icon: FolderArchiveIcon,
      },
    ];

    if (selectedWorkerIsNonQualificato) {
      tabs.push({
        id: "non-qualificato",
        label: "Non qualificato",
        icon: SirenIcon,
      });
    }

    return tabs;
  }, [selectedWorkerIsNonQualificato]);
  const [activeWorkerSection, setActiveWorkerSection] =
    React.useState("profilo");

  const setWorkerSectionRef = React.useCallback(
    (sectionId: string) => (node: HTMLDivElement | null) => {
      sectionRefs.current[sectionId] = node;
    },
    [],
  );

  const scrollToWorkerSection = React.useCallback((sectionId: string) => {
    const container = detailScrollRef.current;
    const target = sectionRefs.current[sectionId];
    if (!container || !target) return;

    setActiveWorkerSection(sectionId);
    container.scrollTo({
      top: Math.max(target.offsetTop - 124, 0),
      behavior: "smooth",
    });
  }, []);

  React.useEffect(() => {
    setActiveWorkerSection(workerSectionTabs[0]?.id ?? "profilo");
  }, [selectedWorkerId, workerSectionTabs]);

  React.useEffect(() => {
    const container = detailScrollRef.current;
    if (!container || workerSectionTabs.length === 0) return;

    const syncActiveSection = () => {
      const scrollTop = container.scrollTop;
      let nextActive = workerSectionTabs[0]?.id ?? "profilo";

      for (const tab of workerSectionTabs) {
        const node = sectionRefs.current[tab.id];
        if (!node) continue;
        if (node.offsetTop - 148 <= scrollTop) {
          nextActive = tab.id;
        } else {
          break;
        }
      }

      setActiveWorkerSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };

    syncActiveSection();
    container.addEventListener("scroll", syncActiveSection, { passive: true });
    return () => {
      container.removeEventListener("scroll", syncActiveSection);
    };
  }, [workerSectionTabs, selectedWorkerId]);

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

        for (const file of files) {
          const safeName = sanitizeFileName(file.name || "foto");
          const storagePath = [
            "lavoratori",
            selectedWorkerId,
            "foto",
            `${Date.now()}-${safeName}`,
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
    [applyUpdatedWorkerRow, selectedWorkerId, selectedWorkerRow?.foto, setError],
  );

  const handlePrimaryWorkerPhotoChange = React.useCallback(
    async (index: number) => {
      if (!selectedWorkerId) return;

      const existingPhotos = normalizeAttachmentArray(selectedWorkerRow?.foto);
      if (existingPhotos.length === 0) return;
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
  const detailPanelProps: Omit<LavoratoriCercaDetailPanelProps, "onClose"> = {
    workerPhotoInputRef,
    onWorkerPhotoInputChange: handleWorkerPhotoInputChange,
    detailScrollRef,
    workerSectionTabs,
    activeWorkerSection,
    onSectionChange: scrollToWorkerSection,
    setWorkerSectionRef,
    selectedWorkerBlacklistAlert,
    selectedWorkerStatusAlert,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerId,
    selectedWorkerAddress,
    availabilityStatusDraft,
    dataRitornoLCVValue,
    statoLavoratoreLookupOptions,
    disponibilitaLookupOptions,
    motivazioniNonIdoneoOptions,
    sessoLookupOptions,
    nazionalitaLookupOptions,
    patchSelectedWorkerField,
    setAvailabilityStatusDraft,
    patchWorkerAvailabilityStatus,
    dataRitornoField: dataRitornoCtrl.field,
    handleNonIdoneoReasonsChange,
    updatingNonQualificato,
    updatingAvailabilityStatus,
    updatingNonIdoneo,
    blacklistChecked,
    handleBlacklistChange,
    presentationPhotoSlots,
    selectedPresentationPhotoIndex,
    onPrimaryWorkerPhotoChange: handlePrimaryWorkerPhotoChange,
    onUploadPhoto: openWorkerPhotoPicker,
    uploadingWorkerPhoto,
    selectedMotivazioneClassName,
    addressMobilityAnchor,
    mobilityLookupOptions,
    addressDraft,
    setAddressDraft,
    isEditingAddress,
    setIsEditingAddress,
    commitAddressField,
    patchWorkerAddressField,
    provinciaLookupOptions,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    availabilityPayload,
    availabilityReadOnlyRows,
    isEditingAvailability,
    setIsEditingAvailability,
    updatingAvailability,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityEditDays: AVAILABILITY_EDIT_DAYS,
    availabilityEditBands: AVAILABILITY_EDIT_BANDS,
    availabilityHourLabels: AVAILABILITY_HOUR_LABELS,
    onAvailabilityMatrixChange: handleAvailabilityMatrixChange,
    onAvailabilitySave: saveWorkerAvailability,
    isEditingJobSearch,
    setIsEditingJobSearch,
    updatingJobSearch,
    jobSearchDraft,
    setJobSearchDraft,
    tipoLavoroDomesticoOptions,
    tipoRapportoLavorativoOptions,
    lavoriAccettabiliOptions,
    trasfertaOptions,
    multipliContrattiOptions,
    paga9Options,
    patchJobSearchField,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    generatingWorkerSummary,
    onGenerateWorkerSummary: handleGenerateWorkerSummary,
    experienceTipoLavoroOptions,
    experienceTipoRapportoOptions,
    isEditingExperience,
    setIsEditingExperience,
    updatingExperience,
    experienceDraft,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    referenceStatusOptions,
    patchReferenceRecord,
    createReferenceRecord,
    anniEsperienzaColfValue,
    anniEsperienzaBadanteValue,
    anniEsperienzaBabysitterValue,
    situazioneLavorativaAttualeValue,
    anniColfField: anniColfCtrl.field,
    anniBadanteField: anniBadanteCtrl.field,
    anniBabysitterField: anniBabysitterCtrl.field,
    situazioneField: situazioneCtrl.field,
    riassuntoProfiloField: riassuntoProfiloCtrl.field,
    selectedSkillCompetenzeValues,
    isEditingSkills,
    setIsEditingSkills,
    updatingSkills,
    skillsDraft,
    setSkillsDraft,
    patchSkillsField,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    isEditingDocuments,
    setIsEditingDocuments,
    updatingDocuments,
    documentsDraft,
    setDocumentsDraft,
    documentiVerificatiOptions,
    documentiInRegolaOptions,
    haiReferenzeOptions,
    resolvedIban,
    naspiLCVValue,
    ibanLCVValue,
    stripeAccountLCVValue,
    naspiField: naspiCtrl.field,
    ibanField: ibanCtrl.field,
    stripeAccountField: stripeAccountCtrl.field,
    generateStripeAccount,
    patchDocumentField,
    upsertSelectedWorkerDocument,
    setError,
    selectedWorkerIsNonQualificato,
    selectedWorkerNonQualificatoIssues,
    nonQualificatoForm,
    groupedDirectRelatedSearches,
    groupedOtherRelatedSearches,
    relatedActiveSearches,
    loadingRelatedActiveSearches,
    getSelectionStateClassName,
    openRicercaDetailFromWorker,
    onOpenRicercaDetail,
    setIsAddSearchDialogOpen,
    operatorName,
    isAddSearchDialogOpen,
    isSubmittingAddSearch,
    searchProcessQuery,
    setSearchProcessQuery,
    isSearchProcessLoading,
    searchProcessResults,
    selectedSearchToAdd,
    setSelectedSearchToAdd,
    manualSearchInsertReason,
    setManualSearchInsertReason,
    onAddWorkerToSearch: handleAddWorkerToSearch,
  }

  return { detailPanelProps }
}
