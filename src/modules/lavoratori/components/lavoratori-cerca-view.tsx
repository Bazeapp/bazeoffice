import * as React from "react";
import { toast } from "sonner";
import { useController } from "react-hook-form";
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
} from "../lib/availability-utils";
import { useLavoratoriData } from "../hooks/use-lavoratori-data";
import { useSelectedWorkerEditor } from "../hooks/use-selected-worker-editor";
import { AddressSectionCard } from "../components/address-section-card";
import { AvailabilityCalendarCard } from "../components/availability-calendar-card";
import { DocumentsCard } from "../components/documents-card";
import { ExperienceReferencesCard } from "../components/experience-references-card";
import { JobSearchCard } from "../components/job-search-card";
import { LavoratoriCercaListPanel } from "../components/lavoratori-cerca-list-panel";
import { WorkerDetailShell } from "../components/worker-detail-shell";
import { RicercaActiveSearchCard } from "@/modules/ricerca/components"
import { WorkerProfileHeader } from "../components/worker-profile-header";
import { RecruiterFeedbackButton } from "../components/recruiter-feedback-sheet";
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name";
import { SkillsCompetenzeCard } from "../components/skills-competenze-card";
import type { OpenRicercaDetailOptions } from "@/routes/app-routes";
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  getStripeAccountMissingRequirements,
  normalizeDomesticRoleDbLabels,
  normalizeDomesticRoleLookupValues,
  readArrayStrings,
} from "../lib/base-utils";
import { isDirectInvolvementSelection } from "../lib/involvement-utils";
import { sortSelectionGroupsByRank } from "../lib/stati-selezione";
import {
  getLookupLabelForSave,
  getLookupOptionLabel,
  getLookupSelectValue,
  getTagClassName,
  resolveLookupColor,
} from "../lib/lookup-utils";
import { Button } from "@/components/ui/button";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import type { RicercaBoardCardData } from "@/modules/ricerca/types"
import { Input } from "@/components/ui/input";
import { fetchFamiglieByIds, fetchFamiglieSearch } from "@/modules/crm/queries"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { fetchLavoratoriByIds } from "../queries/fetch-lavoratori-by-ids";
import { fetchProcessiMatchingByIds, fetchProcessiMatchingSearch, fetchSelezioniLookup } from "@/modules/ricerca/queries"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { invokeAiGenerationFunction } from "@/lib/ai-generation";
import { FieldInput } from "@/components/forms/field-components";
import { Form } from "@/components/ui/form";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
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
import { useProvincieOptions } from "@/hooks/use-provincie";

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

const RELATED_FAMILY_BATCH_SIZE = 150;

function formatRelatedFamilyName(row: Record<string, unknown> | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return familyName || "Famiglia senza nome";
}

function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata);
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
    tipoLavoro: getLookupArrayValues(processRow.tipo_lavoro).join(", ") || "-",
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

function getLookupArrayValues(value: unknown) {
  return readArrayStrings(value);
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
    const result = await fetchFamiglieByIds(batch);

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]));
    }
  }

  return rows;
}

async function searchProcessesForWorkerAdd(query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const familyRowsResult = await fetchFamiglieSearch(normalizedQuery, 10);

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

  if (familyIds.length > 0) {
    const familyProcesses = await fetchProcessiMatchingByIds({
      famigliaIds: familyIds,
    });

    // Preserva il cap di 25 del fetch originale (la RPC non lima lato server).
    for (const processRow of (
      familyProcesses.rows as Record<string, unknown>[]
    ).slice(0, 25)) {
      const processId = asString(processRow.id);
      if (processId) processRowsById.set(processId, processRow);
    }
  }

  const directProcesses = await fetchProcessiMatchingSearch(normalizedQuery, 12);

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
  const normalizedValue = React.useMemo(
    () => normalizeDomesticRoleLookupValues(value, options),
    [options, value],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeDomesticRoleDbLabels(nextValues as string[]))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                return (
                  <ComboboxChip key={itemValue}>
                    {getLookupOptionLabel(options, itemValue)}
                  </ComboboxChip>
                );
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
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

// FASE 5 BIS — i campi auto-contenuti del blocco "Non qualificato" sono ora
// agganciati a un form (useAutoSaveForm) invece di DebouncedInput/Select inline
// con onSave→patch fn. La chiave del form contiene il valore "form-side" e
// onSave instrada alla STESSA patch fn con le STESSE trasformazioni
// dell'originale. I wrapper sotto preservano il mapping bespoke value↔label dei
// lookup (documenti_in_regola via label diretta; hai_referenze via
// getLookupSelectValue/getLookupLabelForSave; tipo_lavoro_domestico via
// normalizeDomesticRole*).

type NonQualificatoFormDraft = {
  descrizione_pubblica: string;
  provincia: string;
  documenti_in_regola: string;
  hai_referenze: string;
  data_di_nascita: string;
  tipo_lavoro_domestico: string[];
  anni_esperienza_colf: string;
  anni_esperienza_babysitter: string;
};

// FASE 5 BIS — campi di dettaglio del lavoratore che pilotano card condivise
// (header/esperienze/documenti) via useController.
type LeadDetailFormDraft = {
  data_ritorno_disponibilita: string;
  anni_esperienza_colf: string;
  anni_esperienza_badante: string;
  anni_esperienza_babysitter: string;
  situazione_lavorativa_attuale: string;
  data_scadenza_naspi: string;
  iban: string;
  id_stripe_account: string;
  riassunto_profilo_breve: string;
};

// Select "documenti_in_regola": il value memorizzato è la LABEL DB (come
// l'originale che usava SelectItem value={option.label}).
function FieldDocumentiInRegolaSelect({
  name,
  options,
  disabled,
}: {
  name: string;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => field.onChange(next || "")}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona stato documenti" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Select "hai_referenze": il value memorizzato è la LABEL DB. Il wrapper
// preserva il mapping label DB ↔ option-value (getLookupSelectValue per
// renderizzare la selezione, getLookupLabelForSave per il commit).
function FieldHaiReferenzeSelect({
  name,
  options,
  disabled,
}: {
  name: string;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  const { field } = useController({ name });
  const stored = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={getLookupSelectValue(stored, options, "") || undefined}
      onValueChange={(next) =>
        field.onChange(getLookupLabelForSave(next, options))
      }
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona referenze" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Combobox multi "tipo_lavoro_domestico" agganciato al form. Riusa
// NonQualificatoTipoLavoroField preservando normalizeDomesticRole* (la
// normalizzazione DB-label la fa già il componente interno).
function FieldNonQualificatoTipoLavoro({
  name,
  options,
  disabled,
}: {
  name: string;
  options: Array<{ label: string; value: string }>;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <NonQualificatoTipoLavoroField
      value={value}
      options={options}
      disabled={disabled}
      onChange={(values) => field.onChange(values)}
    />
  );
}

type LavoratoriCercaViewProps = {
  initialSelectedWorkerId?: string | null;
  onOpenRicercaDetail?: (processId: string, options?: OpenRicercaDetailOptions) => void;
};

export function LavoratoriCercaView({
  initialSelectedWorkerId = null,
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
    selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda,
  } = useLavoratoriData({ initialSelectedWorkerId });
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

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div
        className={
          selectedWorkerId
            ? "grid min-h-0 flex-1 gap-3 px-4 pb-2 pt-4 lg:grid-cols-[332px_minmax(0,1fr)]"
            : "grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-2 pt-4"
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
        onRequestSchema={loadWorkersSchema}
        currentPage={currentPage}
        pageCount={pageCount}
        setPageIndex={setPageIndex}
      />

      {selectedWorkerId ? (
        <>
          <WorkerDetailShell
            key={selectedWorkerId ?? "__empty__"}
            className="scrollbar-visible"
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
                    workerRow={{
                      ...selectedWorkerRow,
                      disponibilita: availabilityStatusDraft.disponibilita,
                      data_ritorno_disponibilita: dataRitornoLCVValue,
                    }}
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
                      void patchWorkerAvailabilityStatus({
                        disponibilita: value || null,
                      });
                    }}
                    onDataRitornoDisponibilitaChange={
                      dataRitornoCtrl.field.onChange
                    }
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
                    dataRitornoDisponibilitaDisabled={false}
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
                                        className={`rounded-full border px-2 py-0.5 text-2xs font-medium ${getSelectionStateClassName(groupLabel)}`}
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
                                        className="cursor-pointer"
                                        onClick={() => openRicercaDetailFromWorker(item.processId)}
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
                                        className={`rounded-full border px-2 py-0.5 text-2xs font-medium ${getSelectionStateClassName(groupLabel)}`}
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
                                        className="cursor-pointer"
                                        onClick={() => openRicercaDetailFromWorker(item.processId)}
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

                <div ref={setWorkerSectionRef("residenza")}>
                  <AddressSectionCard
                    isEditing={isEditingAddress}
                    isUpdating={updatingNonQualificato}
                    addressDraft={addressDraft}
                    provinciaOptions={provinciaLookupOptions}
                    mobilityOptions={mobilityLookupOptions}
                    selectedVia={asString(selectedWorkerAddress?.via) || null}
                    selectedCivico={asString(selectedWorkerAddress?.civico) || null}
                    selectedCap={asString(selectedWorkerAddress?.cap) || null}
                    selectedCitta={asString(selectedWorkerAddress?.citta) || null}
                    selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}

                    selectedMobility={readArrayStrings(
                      selectedWorkerRow?.come_ti_sposti,
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
                    aiSummaryValue={riassuntoProfiloCtrl.field.value}
                    onAiSummaryChange={riassuntoProfiloCtrl.field.onChange}
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
                    selectedAnniEsperienzaColf={anniEsperienzaColfValue}
                    selectedAnniEsperienzaBadante={anniEsperienzaBadanteValue}
                    selectedAnniEsperienzaBabysitter={anniEsperienzaBabysitterValue}
                    selectedSituazioneLavorativaAttuale={situazioneLavorativaAttualeValue}
                    onToggleEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    onAnniEsperienzaColfChange={anniColfCtrl.field.onChange}
                    onAnniEsperienzaBadanteChange={
                      anniBadanteCtrl.field.onChange
                    }
                    onAnniEsperienzaBabysitterChange={
                      anniBabysitterCtrl.field.onChange
                    }
                    onSituazioneLavorativaAttualeChange={
                      situazioneCtrl.field.onChange
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
                      data_scadenza_naspi: naspiLCVValue,
                    }}
                    documents={selectedWorkerDocuments}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    verificationOptions={documentiVerificatiOptions}
                    statoDocumentiOptions={documentiInRegolaOptions}
                    lookupColorsByDomain={lookupColorsByDomain}
                    administrativeValues={{
                      iban: resolvedIban,
                      id_stripe_account: asString(
                        selectedWorkerRow?.id_stripe_account,
                      ),
                      missingStripeRequirements: getStripeAccountMissingRequirements({
                        worker: selectedWorkerRow,
                        address: selectedWorkerAddress,
                        iban: ibanLCVValue,
                      }),
                    }}
                    ibanInputValue={ibanLCVValue}
                    stripeAccountInputValue={stripeAccountLCVValue}
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
                    onNaspiChange={naspiCtrl.field.onChange}
                    onIbanChange={ibanCtrl.field.onChange}
                    onStripeAccountChange={stripeAccountCtrl.field.onChange}
                    onGenerateStripeAccount={generateStripeAccount}
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onUploadError={setError}
                  />
                </div>

                {selectedWorkerIsNonQualificato ? (
                  <div ref={setWorkerSectionRef("non-qualificato")}>
                    <Form {...nonQualificatoForm}>
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
                                <FieldInput
                                  name="descrizione_pubblica"
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
                                <FieldInput
                                  name="provincia"
                                  placeholder="Provincia (sigla)"
                                />
                              ) : null}

                              {issue.id === "documenti" ? (
                                <FieldDocumentiInRegolaSelect
                                  name="documenti_in_regola"
                                  options={documentiInRegolaOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "referenze" ? (
                                <FieldHaiReferenzeSelect
                                  name="hai_referenze"
                                  options={haiReferenzeOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "age" ? (
                                <FieldInput
                                  name="data_di_nascita"
                                  type="date"
                                />
                              ) : null}

                              {issue.id === "tipo-lavoro" ? (
                                <FieldNonQualificatoTipoLavoro
                                  name="tipo_lavoro_domestico"
                                  options={tipoLavoroDomesticoOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "esperienza" ? (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <FieldInput
                                    name="anni_esperienza_colf"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Anni esperienza colf"
                                  />
                                  <FieldInput
                                    name="anni_esperienza_babysitter"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Anni esperienza babysitter"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DetailSectionBlock>
                    </Form>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
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
                  onClick={() => openRicercaDetailFromWorker(selectedSearchToAdd.processId)}
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
    </section>
  );
}
