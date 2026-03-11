import * as React from "react";
import {
  BriefcaseBusinessIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  CakeIcon,
  CalendarDaysIcon,
  FlagIcon,
  PencilIcon,
  PhoneIcon,
  SirenIcon,
  SkullIcon,
  SparklesIcon,
  StarIcon,
  FolderArchiveIcon,
  UploadIcon,
  UsersIcon,
  VenusAndMarsIcon,
  XIcon,
} from "lucide-react";

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import {
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  formatAvailabilityComputedAt,
  formatDateOnly,
} from "@/features/lavoratori/lib/availability-utils";
import { useLavoratoriData } from "@/hooks/use-lavoratori-data";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { AvailabilityStatusCard } from "@/components/lavoratori/availability-status-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { JobSearchCard } from "@/components/lavoratori/job-search-card";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import {
  asInputValue,
  asString,
  getAgeFromBirthDate,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import {
  getTagClassName,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import {
  getWorkerQualificationStatus,
} from "@/features/lavoratori/lib/status-utils";
import { SideCardsPanel } from "@/components/shared/side-cards-panel";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { DetailSectionCard } from "@/components/shared/detail-section-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function LavoratoriCercaView() {
  const {
    workers,
    workersTotal,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
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
    lookupFilterTypeByDomain,
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
    applyUpdatedWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  } = useLavoratoriData();
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const nonIdoneoReasonAnchor = useComboboxAnchor();
  const addressMobilityAnchor = useComboboxAnchor();
  const [feedbackSheetOpen, setFeedbackSheetOpen] = React.useState(false);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
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
  const getMotivazioneColor = React.useCallback(
    (value: string) =>
      resolveLookupColor(
        lookupColorsByDomain,
        "lavoratori.motivazione_non_idoneo",
        value,
      ),
    [lookupColorsByDomain],
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
      lookupOptionsByDomain.get("referenze_lavoratori.referenza_verificata") ?? [],
    [lookupOptionsByDomain],
  );
  const haiReferenzeOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.hai_referenze") ?? [],
    [lookupOptionsByDomain],
  );
  const documentiVerificatiOptions = React.useMemo(() => {
    return lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [];
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
  const canUseSessoSelect = React.useMemo(() => {
    const filterType = lookupFilterTypeByDomain.get("lavoratori.sesso");
    return (
      (filterType === "enum" || filterType === "multi_enum") &&
      sessoLookupOptions.length > 0
    );
  }, [lookupFilterTypeByDomain, sessoLookupOptions]);
  const canUseNazionalitaSelect = React.useMemo(() => {
    const filterType = lookupFilterTypeByDomain.get("lavoratori.nazionalita");
    return (
      (filterType === "enum" || filterType === "multi_enum") &&
      nazionalitaLookupOptions.length > 0
    );
  }, [lookupFilterTypeByDomain, nazionalitaLookupOptions]);
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
  const {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    recruiterFeedbackEntries,
    availabilityPayload,
    disponibilitaBadgeClassName,
    availabilityReadOnlyRows,
    presentationPhotoSlots,
    nonIdoneoReasonValues,
    blacklistChecked,
    updatingNonIdoneo,
    updatingNonQualificato,
    isEditingHeader,
    setIsEditingHeader,
    isEditingAddress,
    setIsEditingAddress,
    isEditingAvailabilityStatus,
    setIsEditingAvailabilityStatus,
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
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    handleNonIdoneoReasonsChange,
    handleBlacklistChange,
    patchSelectedWorkerField,
    commitHeaderField,
    commitAddressField,
    commitAvailabilityField,
    commitAvailabilityStatusField,
    patchAvailabilityStatusValue,
    handleAvailabilityMatrixChange,
    patchJobSearchField,
    patchExperienceRecord,
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
    lookupColorsByDomain,
    setError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });
  const workerSectionTabs = React.useMemo<WorkerSectionTab[]>(() => {
    const tabs: WorkerSectionTab[] = [
      { id: "profilo", label: "Profilo", icon: UsersIcon },
      { id: "residenza", label: "Residenza", icon: MapPinIcon },
      { id: "disponibilita", label: "Disponibilita", icon: CalendarDaysIcon },
      { id: "calendario", label: "Calendario", icon: CalendarDaysIcon },
      { id: "ricerca", label: "Ricerca", icon: BriefcaseBusinessIcon },
      { id: "esperienze", label: "Esperienze", icon: UsersIcon },
      { id: "competenze", label: "Competenze", icon: SparklesIcon },
      { id: "documenti", label: "Documenti", icon: FolderArchiveIcon },
    ];

    if (selectedWorkerIsNonIdoneo) {
      tabs.push({ id: "non-idoneo", label: "Non idoneo", icon: SirenIcon });
    }

    if (selectedWorkerIsNonQualificato) {
      tabs.push({
        id: "non-qualificato",
        label: "Non qualificato",
        icon: SirenIcon,
      });
    }

    tabs.push(
      { id: "preferenze", label: "Preferenze", icon: StarIcon },
      { id: "processi", label: "Processi", icon: MessageSquareTextIcon },
    );

    return tabs;
  }, [selectedWorkerIsNonIdoneo, selectedWorkerIsNonQualificato]);
  const [activeWorkerSection, setActiveWorkerSection] = React.useState("profilo");

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

  return (
    <div
      className={
        selectedWorkerId
          ? "grid h-[calc(100vh-7.5rem)] min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]"
          : "grid h-[calc(100vh-7.5rem)] min-h-0 gap-4 grid-cols-1"
      }
    >
      <div className="flex min-h-0 flex-col gap-2">
        <SideCardsPanel
          title="Lavoratori"
          icon={UsersIcon}
          subtitle={
            loading
              ? "Caricamento..."
              : `${workers.length} su ${workersTotal} lavoratori`
          }
          headerClassName="px-5 pb-1"
          contentClassName="space-y-3 px-5 pt-0 pb-3"
          className="h-full gap-2"
        >
          <DataTableToolbar
            table={table}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
            filters={filters}
            onFiltersChange={setFilters}
            filterFields={filterFields}
            searchPlaceholder="Cerca lavoratori..."
            groupOptions={[]}
            enableGrouping={false}
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
          />

          {loading ? (
            <p className="text-muted-foreground py-3 text-sm">
              Caricamento lavoratori...
            </p>
          ) : error ? (
            <p className="py-3 text-sm text-red-600">{error}</p>
          ) : workers.length === 0 ? (
            <p className="text-muted-foreground py-3 text-sm">
              Nessun lavoratore trovato.
            </p>
          ) : (
            <div
              className={
                selectedWorkerId
                  ? "space-y-2"
                  : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              }
            >
              {workers.map((worker) => (
                <LavoratoreCard
                  key={worker.id}
                  worker={worker}
                  isActive={worker.id === selectedWorkerId}
                  onClick={() =>
                    setSelectedWorkerId((previous) =>
                      previous === worker.id ? null : worker.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </SideCardsPanel>

        <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
          <p>
            Pagina {currentPage} di {pageCount} ({workersTotal} record)
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Prec"
                  className={
                    pageIndex <= 0 || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (pageIndex <= 0 || loading) return;
                    setPageIndex((previous) => Math.max(previous - 1, 0));
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Succ"
                  className={
                    currentPage >= pageCount || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (currentPage >= pageCount || loading) return;
                    setPageIndex((previous) => previous + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {selectedWorkerId ? (
        <section
          ref={detailScrollRef}
          className="bg-background relative min-h-0 overflow-y-auto rounded-xl border px-4 pt-0 pb-4"
        >
          {selectedWorker ? (
            <div className="space-y-6">
              <div className="sticky top-0 z-20 -mx-4 -mt-4 -mr-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
                <Tabs
                  value={activeWorkerSection}
                  onValueChange={scrollToWorkerSection}
                  className="w-full"
                >
                  <TabsList
                    variant="line"
                    className="h-auto w-full flex-wrap justify-start gap-x-1 gap-y-2 p-0"
                  >
                    {workerSectionTabs.map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="h-10 flex-none rounded-full bg-muted/35 px-3 text-sm shadow-none"
                        >
                          <TabIcon className="size-4" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-6 text-sm">
                <div ref={setWorkerSectionRef("profilo")} className="mb-6 flex items-stretch gap-5">
                  {(() => {
                    const qualificationStatus =
                      getWorkerQualificationStatus(selectedWorker);
                    const StatusIcon = qualificationStatus.icon;
                    return (
                      <div className="flex w-52 shrink-0 flex-col gap-2 self-stretch">
                        {isEditingHeader ? (
                          <div
                            className={`relative min-h-0 flex-1 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
                            title={qualificationStatus.label}
                          >
                            <Carousel
                              opts={{ loop: false }}
                              className="h-full w-full"
                            >
                              <CarouselContent className="ml-0 h-full">
                                {presentationPhotoSlots.map(
                                  (photoUrl, index) => (
                                    <CarouselItem
                                      key={photoUrl}
                                      className="h-full basis-full pl-0"
                                    >
                                      <div className="h-full">
                                        <Card className="h-full rounded-none border-0 shadow-none">
                                          <CardContent className="relative flex h-full min-h-80 items-center justify-center p-0">
                                            <img
                                              src={photoUrl}
                                              alt={`Foto profilo ${index + 1}`}
                                              className="h-full w-full object-cover"
                                            />
                                            <Button
                                              type="button"
                                              size="icon-sm"
                                              variant="outline"
                                              aria-label="Modifica immagine con AI"
                                              title="Modifica immagine con AI"
                                              className="absolute top-2 right-2 rounded-full bg-background/90"
                                              onClick={() => {}}
                                            >
                                              <SparklesIcon className="size-4" />
                                            </Button>
                                            <Button
                                              type="button"
                                              size="icon-sm"
                                              variant={
                                                selectedPresentationPhotoIndex ===
                                                index
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              aria-label={
                                                selectedPresentationPhotoIndex ===
                                                index
                                                  ? "Foto principale"
                                                  : "Imposta come foto principale"
                                              }
                                              title={
                                                selectedPresentationPhotoIndex ===
                                                index
                                                  ? "Foto principale"
                                                  : "Imposta come foto principale"
                                              }
                                              className="absolute right-2 bottom-2 rounded-full"
                                              onClick={() =>
                                                setSelectedPresentationPhotoIndex(
                                                  index,
                                                )
                                              }
                                            >
                                              <StarIcon className="size-4" />
                                            </Button>
                                            <span
                                              className={`absolute left-2 bottom-2 inline-flex size-5 items-center justify-center rounded-full ${qualificationStatus.badgeClassName}`}
                                            >
                                              <StatusIcon className="size-3.5" />
                                            </span>
                                          </CardContent>
                                        </Card>
                                      </div>
                                    </CarouselItem>
                                  ),
                                )}
                              </CarouselContent>
                              <CarouselPrevious className="left-2" />
                              <CarouselNext className="right-2" />
                            </Carousel>
                          </div>
                        ) : (
                          <div
                            className={`bg-muted relative flex flex-1 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
                            title={qualificationStatus.label}
                          >
                            {selectedWorker.immagineUrl ? (
                              <img
                                src={selectedWorker.immagineUrl}
                                alt={selectedWorker.nomeCompleto}
                                className="h-full w-full scale-[1.85] object-cover"
                              />
                            ) : (
                              <span className="text-muted-foreground px-2 text-center text-xs">
                                Nessuna immagine
                              </span>
                            )}
                            <span
                              className={`absolute right-1 bottom-1 inline-flex size-5 items-center justify-center rounded-full ${qualificationStatus.badgeClassName}`}
                            >
                              <StatusIcon className="size-3.5" />
                            </span>
                          </div>
                        )}
                        {isEditingHeader ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => {}}
                          >
                            <UploadIcon className="size-4" />
                            Carica nuova immagine
                          </Button>
                        ) : null}
                      </div>
                    );
                  })()}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditingHeader ? (
                          <div className="flex items-start gap-2">
                            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                              <Input
                                value={headerDraft.nome}
                                onChange={(event) =>
                                  setHeaderDraft((current) => ({
                                    ...current,
                                    nome: event.target.value,
                                  }))
                                }
                                onBlur={() => void commitHeaderField("nome")}
                                disabled={updatingNonQualificato}
                                placeholder="Nome"
                                className="h-8 w-40 text-sm"
                              />
                              <Input
                                value={headerDraft.cognome}
                                onChange={(event) =>
                                  setHeaderDraft((current) => ({
                                    ...current,
                                    cognome: event.target.value,
                                  }))
                                }
                                onBlur={() => void commitHeaderField("cognome")}
                                disabled={updatingNonQualificato}
                                placeholder="Cognome"
                                className="h-8 w-40 text-sm"
                              />
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={
                                  isEditingHeader
                                    ? "Termina modifica header"
                                    : "Modifica header"
                                }
                                title={
                                  isEditingHeader
                                    ? "Termina modifica header"
                                    : "Modifica header"
                                }
                                onClick={() =>
                                  setIsEditingHeader((current) => !current)
                                }
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={
                                  blacklistChecked
                                    ? "Rimuovi da blacklist"
                                    : "Aggiungi a blacklist"
                                }
                                title={
                                  blacklistChecked
                                    ? "Rimuovi da blacklist"
                                    : "Aggiungi a blacklist"
                                }
                                onClick={() =>
                                  void handleBlacklistChange(!blacklistChecked)
                                }
                                disabled={updatingNonIdoneo}
                                className={
                                  blacklistChecked
                                    ? "text-red-600 hover:text-red-700"
                                    : undefined
                                }
                              >
                                <SkullIcon />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="truncate text-2xl leading-tight font-semibold">
                                {selectedWorker.nomeCompleto}
                              </p>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={
                                    isEditingHeader
                                      ? "Termina modifica header"
                                      : "Modifica header"
                                  }
                                  title={
                                    isEditingHeader
                                      ? "Termina modifica header"
                                      : "Modifica header"
                                  }
                                  onClick={() =>
                                    setIsEditingHeader((current) => !current)
                                  }
                                >
                                  <PencilIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={
                                    blacklistChecked
                                      ? "Rimuovi da blacklist"
                                      : "Aggiungi a blacklist"
                                  }
                                  title={
                                    blacklistChecked
                                      ? "Rimuovi da blacklist"
                                      : "Aggiungi a blacklist"
                                  }
                                  onClick={() =>
                                    void handleBlacklistChange(
                                      !blacklistChecked,
                                    )
                                  }
                                  disabled={updatingNonIdoneo}
                                  className={
                                    blacklistChecked
                                      ? "text-red-600 hover:text-red-700"
                                      : undefined
                                  }
                                >
                                  <SkullIcon />
                                </Button>
                              </div>
                            </div>
                            <p className="text-muted-foreground line-clamp-4 text-sm leading-5">
                              {asString(
                                selectedWorkerRow?.descrizione_pubblica,
                              ) || "-"}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Chiudi scheda"
                        title="Chiudi scheda"
                        onClick={() => setSelectedWorkerId(null)}
                      >
                        <XIcon />
                      </Button>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <p className="text-muted-foreground flex items-center gap-2">
                        <MailIcon className="size-4 shrink-0" />
                        {isEditingHeader ? (
                          <div className="w-full max-w-md">
                            <Input
                              type="email"
                              value={headerDraft.email}
                              onChange={(event) =>
                                setHeaderDraft((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                              onBlur={() => void commitHeaderField("email")}
                              disabled={updatingNonQualificato}
                              placeholder="Email"
                              className="h-7 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="truncate">
                            {asString(selectedWorkerRow?.email) || "-"}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <PhoneIcon className="size-4 shrink-0" />
                        {isEditingHeader ? (
                          <div className="w-full max-w-xs">
                            <Input
                              type="tel"
                              value={headerDraft.telefono}
                              onChange={(event) =>
                                setHeaderDraft((current) => ({
                                  ...current,
                                  telefono: event.target.value,
                                }))
                              }
                              onBlur={() => void commitHeaderField("telefono")}
                              disabled={updatingNonQualificato}
                              placeholder="Telefono"
                              className="h-7 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="truncate">
                            {asString(selectedWorkerRow?.telefono) || "-"}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <MapPinIcon className="size-4 shrink-0" />
                        <span className="truncate">
                          {asString(selectedWorkerRow?.cap) || "-"}
                        </span>
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <VenusAndMarsIcon className="size-4 shrink-0" />
                        {isEditingHeader ? (
                          canUseSessoSelect ? (
                            <div className="w-full max-w-xs">
                              <Select
                                value={headerDraft.sesso || undefined}
                                onValueChange={(value) => {
                                  setHeaderDraft((current) => ({
                                    ...current,
                                    sesso: value,
                                  }));
                                  void patchSelectedWorkerField(
                                    "sesso",
                                    value || null,
                                  );
                                }}
                                disabled={updatingNonQualificato}
                              >
                                <SelectTrigger className="h-7 text-sm">
                                  <SelectValue placeholder="Seleziona sesso" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sessoLookupOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <Input
                              value={headerDraft.sesso}
                              onChange={(event) =>
                                setHeaderDraft((current) => ({
                                  ...current,
                                  sesso: event.target.value,
                                }))
                              }
                              onBlur={() => void commitHeaderField("sesso")}
                              disabled={updatingNonQualificato}
                              placeholder="Sesso"
                              className="h-7 w-48 text-sm"
                            />
                          )
                        ) : (
                          <span className="truncate">
                            {asString(selectedWorkerRow?.sesso) || "-"}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <FlagIcon className="size-4 shrink-0" />
                        {isEditingHeader ? (
                          canUseNazionalitaSelect ? (
                            <div className="w-full max-w-xs">
                              <Select
                                value={headerDraft.nazionalita || undefined}
                                onValueChange={(value) => {
                                  setHeaderDraft((current) => ({
                                    ...current,
                                    nazionalita: value,
                                  }));
                                  void patchSelectedWorkerField(
                                    "nazionalita",
                                    value || null,
                                  );
                                }}
                                disabled={updatingNonQualificato}
                              >
                                <SelectTrigger className="h-7 text-sm">
                                  <SelectValue placeholder="Seleziona nazionalita" />
                                </SelectTrigger>
                                <SelectContent>
                                  {nazionalitaLookupOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <Input
                              value={headerDraft.nazionalita}
                              onChange={(event) =>
                                setHeaderDraft((current) => ({
                                  ...current,
                                  nazionalita: event.target.value,
                                }))
                              }
                              onBlur={() =>
                                void commitHeaderField("nazionalita")
                              }
                              disabled={updatingNonQualificato}
                              placeholder="Nazionalita"
                              className="h-7 w-56 text-sm"
                            />
                          )
                        ) : (
                          <span className="truncate">
                            {asString(selectedWorkerRow?.nazionalita) || "-"}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <CalendarDaysIcon className="size-4 shrink-0" />
                        {isEditingHeader ? (
                          <div className="w-full max-w-xs">
                            <Input
                              type="date"
                              value={headerDraft.data_di_nascita}
                              onChange={(event) =>
                                setHeaderDraft((current) => ({
                                  ...current,
                                  data_di_nascita: event.target.value,
                                }))
                              }
                              onBlur={() =>
                                void commitHeaderField("data_di_nascita")
                              }
                              disabled={updatingNonQualificato}
                              className="h-7 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="truncate">
                            {asString(selectedWorkerRow?.data_di_nascita) ||
                              "-"}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <CakeIcon className="size-4 shrink-0" />
                        <span className="truncate">
                          {getAgeFromBirthDate(
                            selectedWorkerRow?.data_di_nascita,
                          ) ?? "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div ref={setWorkerSectionRef("residenza")}>
                  <AddressSectionCard
                    isEditing={isEditingAddress}
                    isUpdating={updatingNonQualificato}
                    addressDraft={addressDraft}
                    provinciaOptions={provinciaLookupOptions}
                    mobilityOptions={mobilityLookupOptions}
                    selectedProvincia={asString(selectedWorkerRow?.provincia)}
                    selectedCap={asString(selectedWorkerRow?.cap)}
                    selectedAddress={asString(
                      selectedWorkerRow?.indirizzo_residenza_completo,
                    )}
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

                <div ref={setWorkerSectionRef("disponibilita")}>
                  <AvailabilityStatusCard
                    isEditing={isEditingAvailabilityStatus}
                    isUpdating={updatingAvailabilityStatus}
                    disponibilitaOptions={disponibilitaLookupOptions}
                    draft={availabilityStatusDraft}
                    selectedDisponibilita={asString(
                      selectedWorkerRow?.disponibilita,
                    )}
                    selectedDisponibilitaBadgeClassName={
                      disponibilitaBadgeClassName
                    }
                    selectedDataRitorno={
                      formatDateOnly(
                        asString(selectedWorkerRow?.data_ritorno_disponibilita),
                      ) ?? "-"
                    }
                    onToggleEdit={() =>
                      setIsEditingAvailabilityStatus((current) => !current)
                    }
                    onDisponibilitaChange={(value) => {
                      setAvailabilityStatusDraft((current) => ({
                        ...current,
                        disponibilita: value,
                      }));
                      void patchAvailabilityStatusValue("disponibilita", value);
                    }}
                    onDataRitornoChange={(value) =>
                      setAvailabilityStatusDraft((current) => ({
                        ...current,
                        data_ritorno_disponibilita: value,
                      }))
                    }
                    onDataRitornoBlur={() =>
                      void commitAvailabilityStatusField(
                        "data_ritorno_disponibilita",
                      )
                    }
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
                    editDays={AVAILABILITY_EDIT_DAYS.map(({ field, label }) => ({
                      field,
                      label,
                    }))}
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
                      void commitAvailabilityField("vincoli_orari_disponibilita")
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
                    isEditing={isEditingExperience}
                    isUpdating={updatingExperience}
                    draft={experienceDraft}
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    lookupColorsByDomain={lookupColorsByDomain}
                    experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                    experienceTipoRapportoOptions={experienceTipoRapportoOptions}
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
                    fallbackDocuments={{
                      allegato_codice_fiscale_fronte:
                        selectedWorkerRow?.docs_codice_fiscale_fronte ?? null,
                      allegato_codice_fiscale_retro:
                        selectedWorkerRow?.docs_codice_fiscale_retro ?? null,
                      allegato_documento_identita_fronte:
                        selectedWorkerRow?.docs_documento_identita_fronte ?? null,
                      allegato_documento_identita_retro:
                        selectedWorkerRow?.docs_documento_identita_retro ?? null,
                      allegato_permesso_di_soggiorno_fronte:
                        selectedWorkerRow?.docs_permesso_di_soggiorno_fronte ?? null,
                      allegato_permesso_di_soggiorno_retro:
                        selectedWorkerRow?.docs_permesso_di_soggiorno_retro ?? null,
                      allegato_ricevuta_rinnovo_permesso:
                        selectedWorkerRow?.docs_ricevuta_rinnovo_permesso_di_soggiorno ??
                        null,
                    }}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    verificationOptions={documentiVerificatiOptions}
                    statoDocumentiOptions={documentiInRegolaOptions}
                    lookupColorsByDomain={lookupColorsByDomain}
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
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onUploadError={setError}
                  />
                </div>

                {selectedWorkerIsNonIdoneo ? (
                  <div ref={setWorkerSectionRef("non-idoneo")}>
                    <DetailSectionCard
                      title="Questo lavoratore non è idoneo"
                      titleIcon={
                        <SirenIcon className="text-muted-foreground size-4" />
                      }
                      titleOnBorder
                      contentClassName="space-y-4"
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Motivazione</p>
                        <Combobox
                        multiple
                        autoHighlight
                        items={motivazioniNonIdoneoOptions.map(
                          (option) => option.value,
                        )}
                        value={nonIdoneoReasonValues}
                        onValueChange={(nextValues) => {
                          void handleNonIdoneoReasonsChange(
                            nextValues as string[],
                          );
                        }}
                        disabled={updatingNonIdoneo}
                      >
                        <ComboboxChips
                          ref={nonIdoneoReasonAnchor}
                          className="w-full"
                        >
                          <ComboboxValue>
                            {(values) => (
                              <React.Fragment>
                                {values.map((value: string) => (
                                  <ComboboxChip
                                    key={value}
                                    className={getTagClassName(
                                      getMotivazioneColor(value),
                                    )}
                                  >
                                    {getMotivazioneLabel(value)}
                                  </ComboboxChip>
                                ))}
                                <ComboboxChipsInput />
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent
                          anchor={nonIdoneoReasonAnchor}
                          className="max-h-80"
                        >
                          <ComboboxEmpty>
                            Nessuna motivazione trovata.
                          </ComboboxEmpty>
                          <ComboboxList className="max-h-72 overflow-y-auto">
                            {(item) => (
                              <ComboboxItem
                                key={item}
                                value={item}
                                className={getTagClassName(
                                  getMotivazioneColor(item),
                                )}
                              >
                                {getMotivazioneLabel(item)}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      </div>
                    </DetailSectionCard>
                  </div>
                ) : null}

                {selectedWorkerIsNonQualificato ? (
                  <div ref={setWorkerSectionRef("non-qualificato")}>
                    <DetailSectionCard
                      title="Questo lavoratore non è qualificato"
                      titleIcon={
                        <SirenIcon className="text-muted-foreground size-4" />
                      }
                      titleOnBorder
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
                                onClick={() => {}}
                                disabled={updatingNonQualificato}
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
                                  asString(selectedWorkerRow?.documenti_in_regola) ||
                                  undefined
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
                                  asString(selectedWorkerRow?.hai_referenze) ||
                                  undefined
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
                  </DetailSectionCard>
                  </div>
                ) : null}

                <div ref={setWorkerSectionRef("preferenze")}>
                  <DetailSectionCard
                    title="Preferenze"
                    titleOnBorder
                    contentClassName="flex flex-col items-start gap-2"
                  >
                    {selectedWorker.tipoRuolo ? (
                      <Badge variant="outline">{selectedWorker.tipoRuolo}</Badge>
                    ) : null}
                    {selectedWorker.tipoLavoro ? (
                      <Badge variant="outline">{selectedWorker.tipoLavoro}</Badge>
                    ) : null}
                  </DetailSectionCard>
                </div>

                <div ref={setWorkerSectionRef("processi")}>
                  <DetailSectionCard
                    title="Processi coinvolti"
                    titleOnBorder
                    contentClassName="space-y-2"
                  >
                    <p className="text-muted-foreground text-sm">
                      Placeholder processi coinvolti.
                    </p>
                  </DetailSectionCard>
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
          <Sheet open={feedbackSheetOpen} onOpenChange={setFeedbackSheetOpen}>
            <SheetContent
              side="right"
              className="w-full overflow-y-auto sm:max-w-130"
            >
              <SheetHeader>
                <SheetTitle>Feedback recruiter</SheetTitle>
                <SheetDescription>
                  Storico note su questo lavoratore
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4 pt-0">
                {recruiterFeedbackEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nessun feedback disponibile.
                  </p>
                ) : (
                  recruiterFeedbackEntries.map((entry, index) => (
                    <div
                      key={`${entry.name}-${entry.date}-${index}`}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{entry.name}</p>
                        {entry.date ? (
                          <Badge variant="outline">{entry.date}</Badge>
                        ) : null}
                      </div>
                      {entry.text ? (
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                      ) : null}
                      {index < recruiterFeedbackEntries.length - 1 ? (
                        <Separator />
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </section>
      ) : null}
    </div>
  );
}
