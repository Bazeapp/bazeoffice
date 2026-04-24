import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SirenIcon,
  SparklesIcon,
  FolderArchiveIcon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import {
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  formatAvailabilityComputedAt,
} from "@/features/lavoratori/lib/availability-utils";
import { useLavoratoriData } from "@/hooks/use-lavoratori-data";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { JobSearchCard } from "@/components/lavoratori/job-search-card";
import { LavoratoriCercaListPanel } from "@/components/lavoratori/lavoratori-cerca-list-panel";
import { WorkerDetailShell } from "@/components/lavoratori/worker-detail-shell";
import { RicercaActiveSearchCard } from "@/components/ricerca/ricerca-active-search-card";
import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { RecruiterFeedbackSheet } from "@/components/lavoratori/recruiter-feedback-sheet";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  formatWorkerAddressLine,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import {
  getTagClassName,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils";
import { Button } from "@/components/ui/button";
import { DetailSectionBlock } from "@/components/shared/detail-section-card";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import type { RicercaBoardCardData } from "@/hooks/use-ricerca-board";
import { Input } from "@/components/ui/input";
import {
  fetchFamiglie,
  fetchLavoratori,
  fetchProcessiMatching,
  fetchSelezioniLavoratori,
  createRecord,
  updateRecord,
} from "@/lib/anagrafiche-api";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { invokeAiGenerationFunction } from "@/lib/ai-generation";
import { supabase } from "@/lib/supabase-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type NonQualificatoTipoLavoroFieldProps = {
  value: string[];
  options: Array<{ label: string; value: string }>;
  disabled: boolean;
  onChange: (values: string[]) => void;
};

type WorkerSectionTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

type WorkerRelatedSearchItem = {
  selectionId: string;
  processId: string;
  familyName: string;
  ricercaLabel: string;
  recruiterLabel: string;
  statoSelezione: string;
  statoRicerca: string;
  orarioDiLavoro: string;
  zona: string;
  appunti: string;
  boardCard: RicercaBoardCardData;
};

type SearchProcessResult = {
  processId: string;
  familyId: string;
  familyName: string;
  familyEmail: string;
  searchLabel: string;
  statoRicerca: string;
  tipoLavoro: string;
  tipoRapporto: string;
  orarioDiLavoro: string;
  zona: string;
};

const RELATED_SELECTIONS_PAGE_SIZE = 500;
const RELATED_PROCESS_BATCH_SIZE = 150;
const RELATED_FAMILY_BATCH_SIZE = 150;
const DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
  "prova in corso",
  "prova con cliente",
  "match",
]);
const DIRECT_INVOLVEMENT_WORK_STATUS_TOKEN = "non attivo";
const OTHER_SEARCH_GROUP_A_PROCESS_STATUS_TOKENS = new Set([
  "da assegnare",
  "raccolta candidature",
  "fare ricerca",
  "in preparazione per invio",
  "in preparazione per l invio",
]);
const OTHER_SEARCH_GROUP_A_SELECTION_STATUS_TOKENS = new Set([
  "prospetto",
  "candidato poor fit",
  "candidato good fit",
  "da colloquiare",
  "non risponde",
  "invitato a colloquio",
  "selezionato",
  "inviato al cliente",
]);
const OTHER_SEARCH_GROUP_B_PROCESS_STATUS_TOKENS = new Set([
  "inviare selezione",
  "selezione inviata in attesa di feedback",
  "selezione inviata ma in attesa di feedback",
  "fase di colloqui",
  "in prova con lavoratore",
  "match",
  "no match",
]);
const OTHER_SEARCH_GROUP_B_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
  "prova in corso",
  "prova con cliente",
  "match",
  "no match",
]);

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDirectInvolvementSelection(selection: Record<string, unknown>) {
  return (
    DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS.has(
      normalizeLookupToken(asString(selection.stato_selezione)),
    ) &&
    normalizeLookupToken(asString(selection.stato_situazione_lavorativa)) ===
      DIRECT_INVOLVEMENT_WORK_STATUS_TOKEN
  );
}

function isOtherSearchSelection(
  selection: Record<string, unknown>,
  processRow: Record<string, unknown>,
) {
  const processStatusToken = normalizeLookupToken(asString(processRow.stato_res));
  const selectionStatusToken = normalizeLookupToken(
    asString(selection.stato_selezione),
  );

  const matchesGroupA =
    OTHER_SEARCH_GROUP_A_PROCESS_STATUS_TOKENS.has(processStatusToken) &&
    OTHER_SEARCH_GROUP_A_SELECTION_STATUS_TOKENS.has(selectionStatusToken);

  const matchesGroupB =
    OTHER_SEARCH_GROUP_B_PROCESS_STATUS_TOKENS.has(processStatusToken) &&
    OTHER_SEARCH_GROUP_B_SELECTION_STATUS_TOKENS.has(selectionStatusToken);

  return matchesGroupA || matchesGroupB;
}

function formatRelatedFamilyName(row: Record<string, unknown> | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return familyName || "Famiglia senza nome";
}

function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asString(processRow.numero_ricerca_attivata);
  if (searchNumber) return `Ricerca #${searchNumber}`;

  const processId = asString(processRow.id);
  return processId ? `Ricerca ${processId.slice(0, 8)}` : "Ricerca";
}

function formatSearchProcessResult(
  processRow: Record<string, unknown>,
  familyRow: Record<string, unknown> | null | undefined,
): SearchProcessResult | null {
  const processId = asString(processRow.id);
  if (!processId) return null;

  const familyId = asString(processRow.famiglia_id) ?? "";
  const familyEmail =
    asString(familyRow?.email) ??
    asString(familyRow?.customer_email) ??
    asString(familyRow?.secondary_email) ??
    "-";

  return {
    processId,
    familyId,
    familyName: formatRelatedFamilyName(familyRow),
    familyEmail,
    searchLabel: formatRelatedSearchLabel(processRow),
    statoRicerca: asString(processRow.stato_res) || "-",
    tipoLavoro: getFirstLookupArrayValue(processRow.tipo_lavoro) ?? "-",
    tipoRapporto: getFirstLookupArrayValue(processRow.tipo_rapporto) ?? "-",
    orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
    zona: formatRelatedZona(processRow),
  };
}

function formatRelatedZona(processRow: Record<string, unknown>) {
  const parts = [
    asString(processRow.indirizzo_prova_comune),
    asString(processRow.indirizzo_prova_provincia),
    asString(processRow.indirizzo_prova_cap),
    asString(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  );

  return parts.join(" • ") || "-";
}

function getFirstLookupArrayValue(value: unknown) {
  return readArrayStrings(value)[0] ?? null;
}

async function fetchAllSelectionsForWorker(workerId: string) {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const result = await fetchSelezioniLavoratori({
      limit: RELATED_SELECTIONS_PAGE_SIZE,
      offset,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: "worker-processi-coinvolti-by-worker",
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: "worker-processi-coinvolti-worker-id",
            field: "lavoratore_id",
            operator: "is",
            value: workerId,
          },
        ],
      },
    });

    const pageRows = Array.isArray(result.rows)
      ? (result.rows as Record<string, unknown>[])
      : [];
    rows.push(...pageRows);

    if (pageRows.length < RELATED_SELECTIONS_PAGE_SIZE) break;
    offset += RELATED_SELECTIONS_PAGE_SIZE;
  }

  return rows;
}

async function fetchRelatedProcessesByIds(processIds: string[]) {
  if (processIds.length === 0) return [];

  const rows: Record<string, unknown>[] = [];

  for (
    let index = 0;
    index < processIds.length;
    index += RELATED_PROCESS_BATCH_SIZE
  ) {
    const batch = processIds.slice(index, index + RELATED_PROCESS_BATCH_SIZE);
    const result = await fetchProcessiMatching({
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `worker-processi-coinvolti-processes-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `worker-processi-coinvolti-process-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    });

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]));
    }
  }

  return rows;
}

async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return [];

  const rows: Record<string, unknown>[] = [];

  for (
    let index = 0;
    index < familyIds.length;
    index += RELATED_FAMILY_BATCH_SIZE
  ) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE);
    const result = await fetchFamiglie({
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `worker-processi-coinvolti-families-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `worker-processi-coinvolti-family-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    });

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]));
    }
  }

  return rows;
}

function buildAnyOfFilter(field: string, values: string[], idPrefix: string) {
  const normalizedValues = Array.from(new Set(values.filter(Boolean)));
  if (normalizedValues.length === 0) return undefined;

  return {
    kind: "group" as const,
    id: `${idPrefix}-${field}`,
    logic: "or" as const,
    nodes: normalizedValues.map((value, index) => ({
      kind: "condition" as const,
      id: `${idPrefix}-${field}-${index}`,
      field,
      operator: "is" as const,
      value,
    })),
  };
}

async function searchProcessesForWorkerAdd(query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const familyRowsResult = await fetchFamiglie({
    limit: 10,
    offset: 0,
    search: normalizedQuery,
    searchFields: [
      "email",
      "customer_email",
      "secondary_email",
      "nome",
      "cognome",
      "telefono",
    ],
    select: [
      "id",
      "nome",
      "cognome",
      "email",
      "customer_email",
      "secondary_email",
      "telefono",
    ],
  });

  const familyRows = Array.isArray(familyRowsResult.rows)
    ? (familyRowsResult.rows as Record<string, unknown>[])
    : [];
  const familyRowsById = new Map<string, Record<string, unknown>>();

  for (const familyRow of familyRows) {
    const familyId = asString(familyRow.id);
    if (familyId) familyRowsById.set(familyId, familyRow);
  }

  const familyIds = familyRows
    .map((familyRow) => asString(familyRow.id))
    .filter((value): value is string => Boolean(value));

  const processRowsById = new Map<string, Record<string, unknown>>();
  const processSelect = [
    "id",
    "famiglia_id",
    "numero_ricerca_attivata",
    "stato_res",
    "tipo_lavoro",
    "tipo_rapporto",
    "orario_di_lavoro",
    "indirizzo_prova_comune",
    "indirizzo_prova_provincia",
    "indirizzo_prova_cap",
    "indirizzo_prova_note",
    "aggiornato_il",
  ];

  if (familyIds.length > 0) {
    const familyProcesses = await fetchProcessiMatching({
      limit: 25,
      offset: 0,
      select: processSelect,
      filters: buildAnyOfFilter(
        "famiglia_id",
        familyIds,
        "worker-add-search-families",
      ),
    });

    for (const processRow of familyProcesses.rows as Record<string, unknown>[]) {
      const processId = asString(processRow.id);
      if (processId) processRowsById.set(processId, processRow);
    }
  }

  const directProcesses = await fetchProcessiMatching({
    limit: 12,
    offset: 0,
    search: normalizedQuery,
    searchFields: ["id", "stato_res", "orario_di_lavoro"],
    select: processSelect,
  });

  for (const processRow of directProcesses.rows as Record<string, unknown>[]) {
    const processId = asString(processRow.id);
    if (processId) processRowsById.set(processId, processRow);
  }

  const missingFamilyIds = Array.from(
    new Set(
      Array.from(processRowsById.values())
        .map((processRow) => asString(processRow.famiglia_id))
        .filter(
          (value): value is string =>
            Boolean(value) && !familyRowsById.has(value),
        ),
    ),
  );
  const missingFamilyRows = await fetchRelatedFamiliesByIds(missingFamilyIds);
  for (const familyRow of missingFamilyRows) {
    const familyId = asString(familyRow.id);
    if (familyId) familyRowsById.set(familyId, familyRow);
  }

  return Array.from(processRowsById.values())
    .map((processRow) =>
      formatSearchProcessResult(
        processRow,
        familyRowsById.get(asString(processRow.famiglia_id) ?? ""),
      ),
    )
    .filter((result): result is SearchProcessResult => Boolean(result))
    .slice(0, 12);
}

function NonQualificatoTipoLavoroField({
  value,
  options,
  disabled,
  onChange,
}: NonQualificatoTipoLavoroFieldProps) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={value}
      onValueChange={(nextValues) => onChange(nextValues as string[])}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                const label =
                  options.find((option) => option.value === itemValue)?.label ??
                  itemValue;
                return <ComboboxChip key={itemValue}>{label}</ComboboxChip>;
              })}
              <ComboboxChipsInput />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessun valore trovato.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {options.find((option) => option.value === item)?.label ?? item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type LavoratoriCercaViewProps = {
  onOpenRicercaDetail?: (processId: string) => void;
};

export function LavoratoriCercaView({
  onOpenRicercaDetail,
}: LavoratoriCercaViewProps = {}) {
  const {
    workers,
    workersTotal,
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
    pageIndex,
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
  } = useLavoratoriData();
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const addressMobilityAnchor = useComboboxAnchor();
  const [feedbackSheetOpen, setFeedbackSheetOpen] = React.useState(false);
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
  const [relatedSearchesRefreshKey, setRelatedSearchesRefreshKey] =
    React.useState(0);
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
      const groupKey = item.statoRicerca || "Senza stato";
      const currentItems = groups.get(groupKey) ?? [];
      currentItems.push(item);
      groups.set(groupKey, currentItems);
    }

    return Array.from(groups.entries());
  }, [relatedActiveSearches.direct]);
  const groupedOtherRelatedSearches = React.useMemo(() => {
    const groups = new Map<string, WorkerRelatedSearchItem[]>();

    for (const item of relatedActiveSearches.other) {
      const groupKey = item.statoRicerca || "Senza stato";
      const currentItems = groups.get(groupKey) ?? [];
      currentItems.push(item);
      groups.set(groupKey, currentItems);
    }

    return Array.from(groups.entries());
  }, [relatedActiveSearches.other]);
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions],
  );
  const getProcessStateClassName = React.useCallback(
    (value: string) =>
      getTagClassName(
        resolveLookupColor(
          lookupColorsByDomain,
          "processi_matching.stato_res",
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
  const provinciaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.provincia") ?? [],
    [lookupOptionsByDomain],
  );
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

  React.useEffect(() => {
    if (!selectedWorkerId) {
      setRelatedActiveSearches({ direct: [], other: [] });
      setLoadingRelatedActiveSearches(false);
      return;
    }

    let isCancelled = false;
    const workerId = selectedWorkerId;

    async function loadRelatedActiveSearches() {
      setLoadingRelatedActiveSearches(true);

      try {
        const workerSelections = await fetchAllSelectionsForWorker(workerId);
        if (isCancelled) return;

        const processIds = Array.from(
          new Set(
            workerSelections
              .map((selection) => asString(selection.processo_matching_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );
        const processRows = await fetchRelatedProcessesByIds(processIds);
        if (isCancelled) return;
        const processRowsById = new Map(
          processRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );

        const familyIds = Array.from(
          new Set(
            processRows
              .map((row) => asString(row.famiglia_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );
        const familyRows = await fetchRelatedFamiliesByIds(familyIds);
        if (isCancelled) return;

        const familyRowsById = new Map(
          familyRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );

        const seenProcessIds = new Set<string>();
        const nextDirectItems: WorkerRelatedSearchItem[] = [];
        const nextOtherItems: WorkerRelatedSearchItem[] = [];

        for (const selection of workerSelections) {
          const selectionId = asString(selection.id);
          const processId = asString(selection.processo_matching_id);
          if (!selectionId || !processId) continue;
          if (seenProcessIds.has(processId)) continue;

          const processRow = processRowsById.get(processId);
          if (!processRow) continue;

          const familyRow = familyRowsById.get(asString(processRow.famiglia_id) ?? "");
          const recruiterId = asString(processRow.recruiter_ricerca_e_selezione_id);
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
            boardCard: {
              id: processId,
              stage: asString(processRow.stato_res) || "-",
              nomeFamiglia: formatRelatedFamilyName(familyRow),
              cognomeFamiglia: "",
              email: "-",
              telefono: "-",
              operatorId: recruiterId,
              oreSettimanali: asString(processRow.ore_settimanale) || "-",
              giorniSettimanali: asString(processRow.giorni_a_settimana) || "-",
              deadline: asString(processRow.deadline_mobile) || "-",
              deadlineRaw: asString(processRow.deadline_mobile),
              zona: formatRelatedZona(processRow),
              tipoLavoroBadge: getFirstLookupArrayValue(processRow.tipo_lavoro),
              tipoLavoroColor: resolveLookupColor(
                lookupColorsByDomain,
                "processi_matching.tipo_lavoro",
                getFirstLookupArrayValue(processRow.tipo_lavoro),
              ),
              tipoRapportoBadge: getFirstLookupArrayValue(processRow.tipo_rapporto),
              tipoRapportoColor: resolveLookupColor(
                lookupColorsByDomain,
                "processi_matching.tipo_rapporto",
                getFirstLookupArrayValue(processRow.tipo_rapporto),
              ),
            },
          };

          if (isDirectInvolvementSelection(selection)) {
            nextDirectItems.push(nextItem);
            seenProcessIds.add(processId);
            continue;
          }

          if (isOtherSearchSelection(selection, processRow)) {
            nextOtherItems.push(nextItem);
            seenProcessIds.add(processId);
          }
        }

        if (isCancelled) return;
        setRelatedActiveSearches({
          direct: nextDirectItems,
          other: nextOtherItems,
        });
      } catch {
        if (isCancelled) return;
        setRelatedActiveSearches({ direct: [], other: [] });
      } finally {
        if (!isCancelled) {
          setLoadingRelatedActiveSearches(false);
        }
      }
    }

    void loadRelatedActiveSearches();

    return () => {
      isCancelled = true;
    };
  }, [
    lookupColorsByDomain,
    recruiterLabelsById,
    relatedSearchesRefreshKey,
    selectedWorkerId,
  ]);
  const {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    recruiterFeedbackEntries,
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
    setAvailabilityStatusDraft,
    jobSearchDraft,
    setJobSearchDraft,
    experienceDraft,
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    handleNonIdoneoReasonsChange,
    handleBlacklistChange,
    patchSelectedWorkerField,
    commitAddressField,
    commitAvailabilityField,
    patchAvailabilityStatusValue,
    handleAvailabilityMatrixChange,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
    patchDocumentField,
    commitDocumentField,
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

      const result = await fetchLavoratori({
        limit: 1,
        offset: 0,
        filters: {
          kind: "group",
          id: "ai-generated-worker-summary",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "ai-generated-worker-summary-id",
              field: "id",
              operator: "is",
              value: selectedWorkerId,
            },
          ],
        },
      });
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
      const existingSelections = await fetchSelezioniLavoratori({
        limit: 1,
        offset: 0,
        select: ["id", "stato_selezione", "processo_matching_id"],
        filters: {
          kind: "group",
          id: "lavoratori-add-search-duplicate-check",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "lavoratori-add-search-process",
              field: "processo_matching_id",
              operator: "is",
              value: processId,
            },
            {
              kind: "condition",
              id: "lavoratori-add-search-worker",
              field: "lavoratore_id",
              operator: "is",
              value: workerId,
            },
          ],
        },
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
                onClick: () => onOpenRicercaDetail(processId),
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

      setIsAddSearchDialogOpen(false);
      setRelatedSearchesRefreshKey((current) => current + 1);
      toast.success("Lavoratore aggiunto alla ricerca in Prospetto", {
        action: onOpenRicercaDetail
          ? {
              label: "Apri ricerca",
              onClick: () => onOpenRicercaDetail(processId),
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

    tabs.push({ id: "processi", label: "Ricerche", icon: MessageSquareTextIcon });

    return tabs;
  }, [selectedWorkerIsNonIdoneo, selectedWorkerIsNonQualificato]);
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

  return (
    <div
      className={
        selectedWorkerId
          ? "grid h-full min-h-0 gap-3 lg:grid-cols-[332px_minmax(0,1fr)]"
          : "grid h-full min-h-0 gap-3 grid-cols-1"
      }
    >
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleWorkerPhotoInputChange}
      />
      <LavoratoriCercaListPanel
        workers={workers}
        workersTotal={workersTotal}
        selectedWorkerId={selectedWorkerId}
        setSelectedWorkerId={setSelectedWorkerId}
        loading={loading}
        error={error}
        table={table}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        filters={filters}
        setFilters={setFilters}
        filterFields={filterFields}
        savedViews={savedViews}
        activeViewId={activeViewId}
        saveCurrentView={saveCurrentView}
        applySavedView={applySavedView}
        deleteSavedView={deleteSavedView}
        applyFilters={applyFilters}
        hasPendingFilters={hasPendingFilters}
        currentPage={currentPage}
        pageCount={pageCount}
        pageIndex={pageIndex}
        setPageIndex={setPageIndex}
      />

      {selectedWorkerId ? (
        <>
          <WorkerDetailShell
            sectionRef={detailScrollRef}
            tabs={workerSectionTabs}
            activeSection={activeWorkerSection}
            onSectionChange={scrollToWorkerSection}
            topBar={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Chiudi scheda lavoratore"
                  title="Chiudi scheda lavoratore"
                  onClick={() => setSelectedWorkerId(null)}
                >
                  <XIcon />
                </Button>
              </>
            }
            headerRef={setWorkerSectionRef("profilo")}
            header={
              <>
                {selectedWorkerBlacklistAlert ? (
                  <div className="flex items-start gap-2 rounded-md bg-rose-50/70 px-3 py-2 text-sm text-rose-700">
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {selectedWorkerBlacklistAlert.statusLabel}
                      </p>
                      <p>{selectedWorkerBlacklistAlert.reasonLabel}</p>
                    </div>
                  </div>
                ) : null}
                {selectedWorkerStatusAlert ? (
                  <div
                    className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                      selectedWorkerStatusAlert.tone === "critical"
                        ? "bg-rose-50/70 text-rose-700"
                        : "bg-zinc-100/70 text-zinc-700"
                    }`}
                  >
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {selectedWorkerStatusAlert.statusLabel}
                      </p>
                      <p>{selectedWorkerStatusAlert.reasonLabel}</p>
                    </div>
                  </div>
                ) : null}
                {selectedWorker && selectedWorkerRow ? (
                  <WorkerProfileHeader
                    worker={selectedWorker}
                    workerRow={selectedWorkerRow}
                    statoLavoratoreOptions={statoLavoratoreLookupOptions}
                    disponibilitaOptions={disponibilitaLookupOptions}
                    motivazioniOptions={motivazioniNonIdoneoOptions}
                    sessoOptions={sessoLookupOptions}
                    nazionalitaOptions={nazionalitaLookupOptions}
                    onPatchField={(field, value) =>
                      patchSelectedWorkerField(field, value)
                    }
                    onStatoLavoratoreChange={(value) =>
                      patchSelectedWorkerField("stato_lavoratore", value)
                    }
                    onDisponibilitaChange={(value) => {
                      setAvailabilityStatusDraft((current) => ({
                        ...current,
                        disponibilita: value ?? "",
                      }));
                      void patchAvailabilityStatusValue(
                        "disponibilita",
                        value ?? "",
                      );
                    }}
                    onDataRitornoDisponibilitaChange={(value) => {
                      setAvailabilityStatusDraft((current) => ({
                        ...current,
                        data_ritorno_disponibilita: value,
                      }));
                      void patchAvailabilityStatusValue(
                        "data_ritorno_disponibilita",
                        value,
                      );
                    }}
                    onMotivazioneChange={(value) =>
                      void handleNonIdoneoReasonsChange(value ? [value] : [])
                    }
                    fieldsDisabled={updatingNonQualificato}
                    statoLavoratoreDisabled={
                      updatingNonQualificato ||
                      statoLavoratoreLookupOptions.length === 0
                    }
                    disponibilitaDisabled={
                      updatingAvailabilityStatus ||
                      disponibilitaLookupOptions.length === 0
                    }
                    dataRitornoDisponibilitaDisabled={
                      updatingAvailabilityStatus
                    }
                    motivazioneDisabled={updatingNonIdoneo}
                    blacklistChecked={blacklistChecked}
                    onBlacklistToggle={(nextValue) =>
                      void handleBlacklistChange(nextValue)
                    }
                    blacklistDisabled={updatingNonIdoneo}
                    presentationPhotoSlots={presentationPhotoSlots}
                    selectedPresentationPhotoIndex={
                      selectedPresentationPhotoIndex
                    }
                    onSelectedPresentationPhotoIndexChange={
                      handlePrimaryWorkerPhotoChange
                    }
                    showUploadPhotoAction
                    onUploadPhoto={openWorkerPhotoPicker}
                    selectedMotivazioneClassName={
                      selectedMotivazioneClassName
                    }
                  />
                ) : null}
              </>
            }
          >
          {selectedWorker ? (
            <div className="space-y-6">
              <div className="space-y-6 text-sm">

                <div ref={setWorkerSectionRef("residenza")}>
                  <AddressSectionCard
                    isEditing={isEditingAddress}
                    isUpdating={updatingNonQualificato}
                    addressDraft={addressDraft}
                    provinciaOptions={provinciaLookupOptions}
                    mobilityOptions={mobilityLookupOptions}
                    selectedProvincia={asString(selectedWorkerRow?.provincia)}
                    selectedCap={asString(selectedWorkerAddress?.cap)}
                    selectedAddress={
                      formatWorkerAddressLine(selectedWorkerAddress) ||
                      asString(selectedWorkerRow?.indirizzo_residenza_completo)
                    }
                    selectedMobility={readArrayStrings(
                      selectedWorkerRow?.come_ti_sposti,
                    )}
                    mobilityAnchor={addressMobilityAnchor}
                    onToggleEdit={() =>
                      setIsEditingAddress((current) => !current)
                    }
                    onProvinciaChange={(value) => {
                      setAddressDraft((current) => ({
                        ...current,
                        provincia: value,
                      }));
                      void patchSelectedWorkerField("provincia", value || null);
                    }}
                    onCapChange={(value) =>
                      setAddressDraft((current) => ({
                        ...current,
                        cap: value,
                      }))
                    }
                    onCapBlur={() => void commitAddressField("cap")}
                    onAddressChange={(value) =>
                      setAddressDraft((current) => ({
                        ...current,
                        indirizzo_residenza_completo: value,
                      }))
                    }
                    onAddressBlur={() =>
                      void commitAddressField("indirizzo_residenza_completo")
                    }
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
                </div>

                <div ref={setWorkerSectionRef("calendario")}>
                  <AvailabilityCalendarCard
                    titleMeta={
                      formatAvailabilityComputedAt(
                        availabilityPayload?.computed_at,
                      ) ?? "-"
                    }
                    isEditing={isEditingAvailability}
                    isUpdating={updatingAvailability}
                    editDays={AVAILABILITY_EDIT_DAYS.map(
                      ({ field, label }) => ({
                        field,
                        label,
                      }),
                    )}
                    editBands={AVAILABILITY_EDIT_BANDS.map(
                      ({ field, label }) => ({ field, label }),
                    )}
                    hourLabels={AVAILABILITY_HOUR_LABELS}
                    readOnlyRows={availabilityReadOnlyRows}
                    matrix={availabilityDraft.matrix}
                    vincoliOrari={availabilityDraft.vincoli_orari_disponibilita}
                    onToggleEdit={() =>
                      setIsEditingAvailability((current) => !current)
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
                    onVincoliBlur={() =>
                      void commitAvailabilityField(
                        "vincoli_orari_disponibilita",
                      )
                    }
                  />
                </div>

                <div ref={setWorkerSectionRef("ricerca")}>
                  <JobSearchCard
                    isEditing={isEditingJobSearch}
                    isUpdating={updatingJobSearch}
                    draft={jobSearchDraft}
                    tipoLavoroOptions={tipoLavoroDomesticoOptions}
                    tipoRapportoOptions={tipoRapportoLavorativoOptions}
                    lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                    trasfertaOptions={trasfertaOptions}
                    multipliContrattiOptions={multipliContrattiOptions}
                    paga9Options={paga9Options}
                    lookupColorsByDomain={lookupColorsByDomain}
                    selectedTipoLavoro={readArrayStrings(
                      selectedWorkerRow?.tipo_lavoro_domestico,
                    )}
                    selectedTipoRapporto={readArrayStrings(
                      selectedWorkerRow?.tipo_rapporto_lavorativo,
                    )}
                    selectedLavoriAccettabili={readArrayStrings(
                      selectedWorkerRow?.check_lavori_accettabili,
                    )}
                    selectedTrasferta={asString(
                      selectedWorkerRow?.check_accetta_lavori_con_trasferta,
                    )}
                    selectedMultipliContratti={asString(
                      selectedWorkerRow?.check_accetta_multipli_contratti,
                    )}
                    selectedPaga9={asString(
                      selectedWorkerRow?.check_accetta_paga_9_euro_netti,
                    )}
                    onToggleEdit={() =>
                      setIsEditingJobSearch((current) => !current)
                    }
                    onTipoLavoroChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        tipo_lavoro_domestico: values,
                      }));
                      void patchJobSearchField(
                        "tipo_lavoro_domestico",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onTipoRapportoChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        tipo_rapporto_lavorativo: values,
                      }));
                      void patchJobSearchField(
                        "tipo_rapporto_lavorativo",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onLavoriAccettabiliChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_lavori_accettabili: values,
                      }));
                      void patchJobSearchField(
                        "check_lavori_accettabili",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onTrasfertaChange={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_lavori_con_trasferta: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_lavori_con_trasferta",
                        value || null,
                      );
                    }}
                    onMultipliContrattiChange={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_multipli_contratti: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_multipli_contratti",
                        value || null,
                      );
                    }}
                    onPaga9Change={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_paga_9_euro_netti: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_paga_9_euro_netti",
                        value || null,
                      );
                    }}
                  />
                </div>

                <div ref={setWorkerSectionRef("esperienze")}>
                  <ExperienceReferencesCard
                    workerId={selectedWorkerId}
                    isEditing={isEditingExperience}
                    showCreateExperienceAction={isEditingExperience}
                    isUpdating={updatingExperience}
                    draft={experienceDraft}
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    aiSummaryValue={asString(
                      selectedWorkerRow?.riassunto_profilo_breve,
                    )}
                    isGeneratingAiSummary={generatingWorkerSummary}
                    onGenerateAiSummary={handleGenerateWorkerSummary}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    lookupColorsByDomain={lookupColorsByDomain}
                    experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                    experienceTipoRapportoOptions={
                      experienceTipoRapportoOptions
                    }
                    referenceStatusOptions={referenceStatusOptions}
                    selectedAnniEsperienzaColf={asInputValue(
                      selectedWorkerRow?.anni_esperienza_colf,
                    )}
                    selectedAnniEsperienzaBadante={asInputValue(
                      selectedWorkerRow?.anni_esperienza_badante,
                    )}
                    selectedAnniEsperienzaBabysitter={asInputValue(
                      selectedWorkerRow?.anni_esperienza_babysitter,
                    )}
                    selectedSituazioneLavorativaAttuale={asString(
                      selectedWorkerRow?.situazione_lavorativa_attuale,
                    )}
                    onToggleEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    onAnniEsperienzaColfChange={(value) =>
                      setExperienceDraft((current) => ({
                        ...current,
                        anni_esperienza_colf: value,
                      }))
                    }
                    onAnniEsperienzaBadanteChange={(value) =>
                      setExperienceDraft((current) => ({
                        ...current,
                        anni_esperienza_badante: value,
                      }))
                    }
                    onAnniEsperienzaBabysitterChange={(value) =>
                      setExperienceDraft((current) => ({
                        ...current,
                        anni_esperienza_babysitter: value,
                      }))
                    }
                    onSituazioneLavorativaAttualeChange={(value) =>
                      setExperienceDraft((current) => ({
                        ...current,
                        situazione_lavorativa_attuale: value,
                      }))
                    }
                    onAnniEsperienzaColfBlur={() =>
                      void commitExperienceField("anni_esperienza_colf")
                    }
                    onAnniEsperienzaBadanteBlur={() =>
                      void commitExperienceField("anni_esperienza_badante")
                    }
                    onAnniEsperienzaBabysitterBlur={() =>
                      void commitExperienceField("anni_esperienza_babysitter")
                    }
                    onSituazioneLavorativaAttualeBlur={() =>
                      void commitExperienceField(
                        "situazione_lavorativa_attuale",
                      )
                    }
                    onExperiencePatch={(experienceId, patch) =>
                      void patchExperienceRecord(experienceId, patch)
                    }
                    onExperienceCreate={(values) =>
                      void createExperienceRecord(values)
                    }
                    onExperienceDelete={(experienceId) =>
                      void deleteExperienceRecord(experienceId)
                    }
                    onReferencePatch={(referenceId, patch) =>
                      void patchReferenceRecord(referenceId, patch)
                    }
                    onReferenceCreate={(values) =>
                      void createReferenceRecord(values)
                    }
                  />
                </div>

                <div ref={setWorkerSectionRef("competenze")}>
                  <SkillsCompetenzeCard
                    isEditing={isEditingSkills}
                    isUpdating={updatingSkills}
                    draft={skillsDraft}
                    selectedValues={selectedSkillCompetenzeValues}
                    lookupOptionsByDomain={lookupOptionsByDomain}
                    lookupColorsByDomain={lookupColorsByDomain}
                    onToggleEdit={() =>
                      setIsEditingSkills((current) => !current)
                    }
                    onFieldChange={(field, value) => {
                      setSkillsDraft((current) => ({
                        ...current,
                        [field]: value,
                      }));
                      void patchSkillsField(field, value);
                    }}
                  />
                </div>

                <div ref={setWorkerSectionRef("documenti")}>
                  <DocumentsCard
                    workerId={selectedWorkerId}
                    isEditing={isEditingDocuments}
                    isUpdating={updatingDocuments}
                    draft={documentsDraft}
                    selectedValues={{
                      stato_verifica_documenti: asString(
                        selectedWorkerRow?.stato_verifica_documenti,
                      ),
                      documenti_in_regola: asString(
                        selectedWorkerRow?.documenti_in_regola,
                      ),
                      data_scadenza_naspi: asString(
                        selectedWorkerRow?.data_scadenza_naspi,
                      ),
                    }}
                    documents={selectedWorkerDocuments}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    verificationOptions={documentiVerificatiOptions}
                    statoDocumentiOptions={documentiInRegolaOptions}
                    lookupColorsByDomain={lookupColorsByDomain}
                    administrativeValues={{
                      iban: asString(selectedWorkerRow?.iban),
                      id_stripe_account: asString(
                        selectedWorkerRow?.id_stripe_account,
                      ),
                    }}
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
                    onNaspiChange={(value) =>
                      setDocumentsDraft((current) => ({
                        ...current,
                        data_scadenza_naspi: value,
                      }))
                    }
                    onNaspiBlur={() =>
                      void commitDocumentField("data_scadenza_naspi")
                    }
                    onIbanChange={(value) =>
                      setDocumentsDraft((current) => ({
                        ...current,
                        iban: value,
                      }))
                    }
                    onIbanBlur={() => void commitDocumentField("iban")}
                    onStripeAccountChange={(value) =>
                      setDocumentsDraft((current) => ({
                        ...current,
                        id_stripe_account: value,
                      }))
                    }
                    onStripeAccountBlur={() =>
                      void commitDocumentField("id_stripe_account")
                    }
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onUploadError={setError}
                  />
                </div>

                {selectedWorkerIsNonQualificato ? (
                  <div ref={setWorkerSectionRef("non-qualificato")}>
                    <DetailSectionBlock
                      title="Questo lavoratore non è qualificato"
                      icon={
                        <SirenIcon className="text-muted-foreground size-4" />
                      }
                      contentClassName="space-y-4"
                    >
                      <div className="space-y-3">
                        {selectedWorkerNonQualificatoIssues.map((issue) => (
                          <div key={issue.id} className="space-y-1">
                            <p className="font-medium">{issue.title}</p>
                            <div>
                              {issue.id === "missing-description" ? (
                                <Input
                                  value={asString(
                                    selectedWorkerRow?.descrizione_pubblica,
                                  )}
                                  onChange={(event) =>
                                    void patchSelectedWorkerField(
                                      "descrizione_pubblica",
                                      event.target.value || null,
                                    )
                                  }
                                  disabled={updatingNonQualificato}
                                  placeholder="Inserisci descrizione"
                                />
                              ) : null}

                              {issue.id === "missing-photo" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={openWorkerPhotoPicker}
                                  disabled={
                                    updatingNonQualificato ||
                                    uploadingWorkerPhoto
                                  }
                                >
                                  <UploadIcon className="size-4" />
                                  Carica foto
                                </Button>
                              ) : null}

                              {issue.id === "not-milano" ? (
                                <Select
                                  value={
                                    asString(selectedWorkerRow?.provincia) ||
                                    undefined
                                  }
                                  onValueChange={(value) =>
                                    void patchSelectedWorkerField(
                                      "provincia",
                                      value || null,
                                    )
                                  }
                                  disabled={updatingNonQualificato}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona provincia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {provinciaLookupOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.label}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}

                              {issue.id === "documenti" ? (
                                <Select
                                  value={
                                    asString(
                                      selectedWorkerRow?.documenti_in_regola,
                                    ) || undefined
                                  }
                                  onValueChange={(value) =>
                                    void patchSelectedWorkerField(
                                      "documenti_in_regola",
                                      value || null,
                                    )
                                  }
                                  disabled={updatingNonQualificato}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona stato documenti" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {documentiInRegolaOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.label}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}

                              {issue.id === "referenze" ? (
                                <Select
                                  value={
                                    asString(
                                      selectedWorkerRow?.hai_referenze,
                                    ) || undefined
                                  }
                                  onValueChange={(value) =>
                                    void patchSelectedWorkerField(
                                      "hai_referenze",
                                      value || null,
                                    )
                                  }
                                  disabled={updatingNonQualificato}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona referenze" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {haiReferenzeOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}

                              {issue.id === "age" ? (
                                <Input
                                  type="date"
                                  value={asString(
                                    selectedWorkerRow?.data_di_nascita,
                                  )}
                                  onChange={(event) =>
                                    void patchSelectedWorkerField(
                                      "data_di_nascita",
                                      event.target.value || null,
                                    )
                                  }
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "tipo-lavoro" ? (
                                <NonQualificatoTipoLavoroField
                                  value={readArrayStrings(
                                    selectedWorkerRow?.tipo_lavoro_domestico,
                                  )}
                                  options={tipoLavoroDomesticoOptions}
                                  disabled={updatingNonQualificato}
                                  onChange={(values) =>
                                    void patchSelectedWorkerField(
                                      "tipo_lavoro_domestico",
                                      values.length > 0 ? values : null,
                                    )
                                  }
                                />
                              ) : null}

                              {issue.id === "esperienza" ? (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={asInputValue(
                                      selectedWorkerRow?.anni_esperienza_colf,
                                    )}
                                    onChange={(event) =>
                                      void patchSelectedWorkerField(
                                        "anni_esperienza_colf",
                                        event.target.value
                                          ? Number(event.target.value)
                                          : null,
                                      )
                                    }
                                    disabled={updatingNonQualificato}
                                    placeholder="Anni esperienza colf"
                                  />
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    value={asInputValue(
                                      selectedWorkerRow?.anni_esperienza_babysitter,
                                    )}
                                    onChange={(event) =>
                                      void patchSelectedWorkerField(
                                        "anni_esperienza_babysitter",
                                        event.target.value
                                          ? Number(event.target.value)
                                          : null,
                                      )
                                    }
                                    disabled={updatingNonQualificato}
                                    placeholder="Anni esperienza babysitter"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DetailSectionBlock>
                  </div>
                ) : null}

                <div ref={setWorkerSectionRef("processi")}>
                  <DetailSectionBlock
                    title="Ricerche coinvolte"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddSearchDialogOpen(true)}
                        disabled={!selectedWorkerId}
                      >
                        <PlusIcon className="size-4" />
                        Aggiungi ad una ricerca
                      </Button>
                    }
                    contentClassName="space-y-2"
                  >
                    {loadingRelatedActiveSearches ? (
                      <p className="text-muted-foreground text-sm">
                        Caricamento ricerche coinvolte...
                      </p>
                    ) : relatedActiveSearches.direct.length === 0 &&
                      relatedActiveSearches.other.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nessuna ricerca coinvolta.
                      </p>
                    ) : (
                      <Tabs defaultValue="direct" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="direct" className="gap-2">
                            Coinvolto direttamente
                            <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                              {relatedActiveSearches.direct.length}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="other" className="gap-2">
                            Tutte le altre ricerche
                            <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                              {relatedActiveSearches.other.length}
                            </span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="direct" className="mt-0">
                          {groupedDirectRelatedSearches.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              Nessun coinvolgimento diretto.
                            </p>
                          ) : (
                            <Accordion
                              type="multiple"
                              defaultValue={groupedDirectRelatedSearches.map(([groupLabel]) => `direct-${groupLabel}`)}
                              className="space-y-3"
                            >
                              {groupedDirectRelatedSearches.map(([groupLabel, groupItems]) => (
                                <AccordionItem
                                  key={`direct-${groupLabel}`}
                                  value={`direct-${groupLabel}`}
                                  className="overflow-hidden rounded-xl border border-border/70 bg-background"
                                >
                                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <div className="flex min-w-0 items-center gap-2 text-left">
                                      <div
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getProcessStateClassName(groupLabel)}`}
                                      >
                                        {groupLabel}
                                      </div>
                                      <span className="text-muted-foreground text-xs">
                                        {groupItems.length} {groupItems.length === 1 ? "ricerca" : "ricerche"}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2 px-4 pb-4">
                                    {groupItems.map((item) => (
                                      <RicercaActiveSearchCard
                                        key={item.selectionId}
                                        data={item.boardCard}
                                      />
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </TabsContent>

                        <TabsContent value="other" className="mt-0">
                          {groupedOtherRelatedSearches.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              Nessun'altra ricerca rilevante.
                            </p>
                          ) : (
                            <Accordion
                              type="multiple"
                              defaultValue={groupedOtherRelatedSearches.map(([groupLabel]) => `other-${groupLabel}`)}
                              className="space-y-3"
                            >
                              {groupedOtherRelatedSearches.map(([groupLabel, groupItems]) => (
                                <AccordionItem
                                  key={`other-${groupLabel}`}
                                  value={`other-${groupLabel}`}
                                  className="overflow-hidden rounded-xl border border-border/70 bg-background"
                                >
                                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <div className="flex min-w-0 items-center gap-2 text-left">
                                      <div
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getProcessStateClassName(groupLabel)}`}
                                      >
                                        {groupLabel}
                                      </div>
                                      <span className="text-muted-foreground text-xs">
                                        {groupItems.length} {groupItems.length === 1 ? "ricerca" : "ricerche"}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2 px-4 pb-4">
                                    {groupItems.map((item) => (
                                      <RicercaActiveSearchCard
                                        key={item.selectionId}
                                        data={item.boardCard}
                                      />
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </DetailSectionBlock>
                </div>
              </div>
            </div>
          ) : null}
          <div className="sticky right-0 bottom-1 z-20 mt-4 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full border-2 border-black bg-background/95"
              title="Apri feedback recruiter"
              aria-label="Apri feedback recruiter"
              onClick={() => setFeedbackSheetOpen(true)}
            >
              <MessageSquareTextIcon className="size-5" />
            </Button>
          </div>
          <RecruiterFeedbackSheet
            open={feedbackSheetOpen}
            onOpenChange={setFeedbackSheetOpen}
            entries={recruiterFeedbackEntries}
          />
        </WorkerDetailShell>
        <Dialog
          open={isAddSearchDialogOpen}
          onOpenChange={(nextOpen) => {
            if (isSubmittingAddSearch) return;
            setIsAddSearchDialogOpen(nextOpen);
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Aggiungi ad una ricerca</DialogTitle>
              <DialogDescription>
                Cerca una ricerca per email famiglia, nome famiglia o ID e
                inserisci il lavoratore in Prospetto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Cerca ricerca</p>
                <Input
                  value={searchProcessQuery}
                  onChange={(event) =>
                    setSearchProcessQuery(event.target.value)
                  }
                  placeholder="Email famiglia, nome famiglia o ID ricerca"
                  className="w-full"
                />
                {searchProcessQuery.trim().length < 2 ? (
                  <p className="text-muted-foreground text-xs">
                    Inserisci almeno 2 caratteri.
                  </p>
                ) : isSearchProcessLoading ? (
                  <p className="text-muted-foreground text-xs">
                    Caricamento risultati...
                  </p>
                ) : searchProcessResults.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Nessuna ricerca trovata.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {searchProcessResults.map((result) => {
                      const isSelected =
                        selectedSearchToAdd?.processId === result.processId;

                      return (
                        <button
                          key={result.processId}
                          type="button"
                          onClick={() => setSelectedSearchToAdd(result)}
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {result.familyName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {result.searchLabel} • {result.familyEmail}
                              </div>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {result.statoRicerca}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span>{result.tipoLavoro}</span>
                            <span>{result.tipoRapporto}</span>
                            <span>{result.orarioDiLavoro}</span>
                            <span>{result.zona}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Motivazione</p>
                <Textarea
                  value={manualSearchInsertReason}
                  onChange={(event) =>
                    setManualSearchInsertReason(event.target.value)
                  }
                  placeholder="Scrivi perché vuoi aggiungere questo lavoratore alla ricerca"
                  className="min-h-28 w-full"
                />
              </div>
            </div>

            <DialogFooter>
              {selectedSearchToAdd && onOpenRicercaDetail ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenRicercaDetail(selectedSearchToAdd.processId)}
                  disabled={isSubmittingAddSearch}
                >
                  <ExternalLinkIcon className="size-4" />
                  Apri ricerca
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSearchDialogOpen(false)}
                disabled={isSubmittingAddSearch}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={() => void handleAddWorkerToSearch()}
                disabled={
                  isSubmittingAddSearch ||
                  !selectedSearchToAdd ||
                  !manualSearchInsertReason.trim()
                }
              >
                {isSubmittingAddSearch ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Aggiungi alla ricerca
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
      ) : null}
    </div>
  );
}
