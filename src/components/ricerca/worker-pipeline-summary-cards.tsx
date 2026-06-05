import * as React from "react";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckIcon,
  Clock3Icon,
  MapPinIcon,
  PencilIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useController } from "react-hook-form";

import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FieldInput } from "@/components/forms/field-components";
import { Form } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_HOUR_LABELS,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  isAvailabilityHourActive,
  parseAvailabilityPayload,
  readAvailabilitySlots,
} from "@/features/lavoratori/lib/availability-utils";
import {
  asInputValue,
  asString,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import {
  getLookupOptionLabel,
  getTagClassName,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils";
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles";
import { useProvincieOptions } from "@/hooks/use-provincie";

type WorkerPipelineSummaryCardsProps = {
  workerRow: LavoratoreRecord;
  selectionRow?: Record<string, unknown> | null;
  relatedActiveSearches: RelatedSearchGroups;
  relatedActiveSearchesLoading?: boolean;
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void;
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void;
  onPatchWorkerAddress?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono" | "note",
    value: string | null,
  ) => Promise<void>;
  workerVia?: string | null;
  workerCivico?: string | null;
  workerCap?: string | null;
  workerCitta?: string | null;
  workerProvincia?: string | null;
  workerCitofono?: string | null;
  onPatchProcessField?: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_civico"
      | "indirizzo_prova_comune"
      | "indirizzo_prova_citofono"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void> | void;
  processWeeklyHours?: string | null;
  familyAddress?: string | null;
  familyCap?: string | null;
  familyProvince?: string | null;
  familyStreet?: string | null;
  familyCivicNumber?: string | null;
  familyCity?: string | null;
  familyIntercom?: string | null;
  familyAddressNote?: string | null;
  familyAvailabilityJson?: string | null;
  familyWorkSchedule?: string | null;
  familyWeeklyFrequency?: string | null;
  provinceOptions?: LookupOption[];
  updatingProcessAddress?: boolean;
  availabilityTitleMeta: string;
  availabilityReadOnlyRows: Array<{ day: string; activeByHour: boolean[] }>;
  lookupOptionsByDomain: Map<string, LookupOption[]>;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  tipoLavoroOptions: LookupOption[];
  tipoRapportoOptions: LookupOption[];
  referenceStatusOptions: LookupOption[];
  experiences: EsperienzaLavoratoreRecord[];
  experiencesLoading?: boolean;
  isGeneratingAiSummary?: boolean;
  onGenerateAiSummary?: () => Promise<void> | void;
  references: ReferenzaLavoratoreRecord[];
  referencesLoading?: boolean;
  documents: DocumentoLavoratoreRecord[];
  documentsLoading?: boolean;
  isEditingAvailability: boolean;
  onToggleAvailabilityEdit: () => void;
  updatingAvailability: boolean;
  isEditingJobSearch: boolean;
  onToggleJobSearchEdit: () => void;
  updatingJobSearch: boolean;
  jobSearchDraft: {
    tipo_lavoro_domestico: string[];
    tipo_rapporto_lavorativo: string[];
    check_accetta_funzionamento_baze: string;
    check_accetta_lavori_con_trasferta: string;
    check_accetta_multipli_contratti: string;
    check_accetta_paga_9_euro_netti: string;
  };
  funzionamentoBazeOptions: LookupOption[];
  trasfertaOptions: LookupOption[];
  multipliContrattiOptions: LookupOption[];
  paga9Options: LookupOption[];
  onJobSearchDraftChange: (
    patch: Partial<{
      check_accetta_funzionamento_baze: string;
      tipo_lavoro_domestico: string[];
      tipo_rapporto_lavorativo: string[];
      check_accetta_lavori_con_trasferta: string;
      check_accetta_multipli_contratti: string;
      check_accetta_paga_9_euro_netti: string;
    }>,
  ) => void;
  onJobSearchFieldPatch: (
    field:
      | "tipo_lavoro_domestico"
      | "tipo_rapporto_lavorativo"
      | "check_accetta_funzionamento_baze"
      | "check_accetta_lavori_con_trasferta"
      | "check_accetta_multipli_contratti"
      | "check_accetta_paga_9_euro_netti",
    value: unknown,
  ) => Promise<void> | void;
  lavoriAccettabili: string[];
  lavoriAccettabiliOptions: LookupOption[];
  availabilityMatrix: Record<string, boolean>;
  availabilityVincoli: string;
  onLavoriAccettabiliChange: (values: string[]) => void;
  onAvailabilityMatrixChange: (
    dayField: AvailabilityEditDayField,
    bandField: AvailabilityEditBandField,
    checked: boolean,
  ) => void;
  onAvailabilityVincoliChange: (value: string) => void;
  onAvailabilitySave: () => void;
  isEditingExperience: boolean;
  onToggleExperienceEdit: () => void;
  updatingExperience: boolean;
  experienceDraft: {
    anni_esperienza_colf: string;
    anni_esperienza_badante: string;
    anni_esperienza_babysitter: string;
    situazione_lavorativa_attuale: string;
  };
  onExperienceDraftChange: (
    patch: Partial<{
      anni_esperienza_colf: string;
      anni_esperienza_badante: string;
      anni_esperienza_babysitter: string;
      situazione_lavorativa_attuale: string;
    }>,
  ) => void;
  onExperienceFieldSave: (field: string, value: string) => void;
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceCreate: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceDelete: (experienceId: string) => Promise<void> | void;
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
  isEditingSkills: boolean;
  onToggleSkillsEdit: () => void;
  updatingSkills: boolean;
  skillsDraft: SkillCompetenzeValues;
  onSkillsDraftChange: (patch: Partial<SkillCompetenzeValues>) => void;
  onSkillsFieldPatch: (
    field: keyof SkillCompetenzeValues,
    value: string,
  ) => Promise<void> | void;
  isEditingDocuments: boolean;
  onToggleDocumentsEdit: () => void;
  updatingDocuments: boolean;
  documentsDraft: {
    stato_verifica_documenti: string;
    documenti_in_regola: string;
    data_scadenza_naspi: string;
    iban: string;
    id_stripe_account: string;
  };
  resolvedIban: string;
  documentiVerificatiOptions: LookupOption[];
  documentiInRegolaOptions: LookupOption[];
  onDocumentVerificationChange: (value: string) => void;
  onDocumentStatusChange: (value: string) => void;
  naspiInputValue?: string;
  ibanInputValue?: string;
  stripeAccountInputValue?: string;
  onDocumentNaspiChange: (value: string) => void;
  onDocumentIbanChange: (value: string) => void;
  onDocumentStripeAccountChange: (value: string) => void;
  onDocumentUpsert: (row: DocumentoLavoratoreRecord) => void;
  onDocumentUploadError: React.Dispatch<React.SetStateAction<string | null>>;
};

type SkillCompetenzeValues = {
  livello_pulizie: string;
  check_accetta_salire_scale_o_soffitti_alti: string;
  compatibilita_famiglie_numerose: string;
  compatibilita_famiglie_molto_esigenti: string;
  compatibilita_lavoro_con_datore_presente_in_casa: string;
  compatibilita_con_case_di_grandi_dimensioni: string;
  compatibilita_con_elevata_autonomia_richiesta: string;
  compatibilita_con_contesti_pacati: string;
  livello_stiro: string;
  compatibilita_con_stiro_esigente: string;
  livello_cucina: string;
  compatibilita_con_cucina_strutturata: string;
  livello_babysitting: string;
  check_accetta_babysitting_multipli_bambini: string;
  check_accetta_babysitting_neonati: string;
  compatibilita_babysitting_neonati: string;
  livello_dogsitting: string;
  check_accetta_case_con_cani: string;
  check_accetta_case_con_cani_grandi: string;
  check_accetta_case_con_gatti: string;
  compatibilita_con_animali_in_casa: string;
  livello_giardinaggio: string;
  livello_italiano: string;
  livello_inglese: string;
};

export type RelatedActiveSearchItem = {
  selectionId: string;
  processId: string;
  familyName: string;
  ricercaLabel: string;
  recruiterLabel: string;
  statoSelezione: string;
  statoSelezioneColor?: string | null;
  statoRicerca: string;
  statoRicercaColor?: string | null;
  orarioDiLavoro: string;
  zona: string;
  appunti: string;
};

export type RelatedSearchGroups = {
  direct: RelatedActiveSearchItem[];
  other: RelatedActiveSearchItem[];
};

function getRelatedSearchBadgeClassName(color: string | null | undefined) {
  return `h-5 px-2 text-[10px] ${getLookupBadgeSoftClassName(color)}`;
}

export function RelatedActiveSearchCard({
  item,
  onOpenSearch,
}: {
  item: RelatedActiveSearchItem;
  onOpenSearch?: (processId: string, selectionId: string) => void;
}) {
  const isInteractive = typeof onOpenSearch === "function";
  const Wrapper = isInteractive ? "button" : "div";

  return (
    <Wrapper
      {...(isInteractive
        ? {
            type: "button" as const,
            onClick: () => onOpenSearch(item.processId, item.selectionId),
          }
        : {})}
      className="w-full rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.familyName}
          </p>
        </div>
        {isInteractive ? (
          <ArrowRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={getRelatedSearchBadgeClassName(item.statoSelezioneColor)}
        >
          {item.statoSelezione || "-"}
        </Badge>
        <Badge
          variant="outline"
          className={getRelatedSearchBadgeClassName(item.statoRicercaColor)}
        >
          {item.statoRicerca || "-"}
        </Badge>
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {item.recruiterLabel ? (
          <div className="flex items-center gap-2">
            <UserRoundIcon className="size-3.5 shrink-0" />
            <span className="truncate">{item.recruiterLabel}</span>
          </div>
        ) : null}
        {item.orarioDiLavoro ? (
          <div className="flex items-center gap-2">
            <Clock3Icon className="size-3.5 shrink-0" />
            <span className="line-clamp-2">{item.orarioDiLavoro}</span>
          </div>
        ) : null}
        {item.zona ? (
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="line-clamp-2">{item.zona}</span>
          </div>
        ) : null}
        {item.appunti ? (
          <p className="line-clamp-3 rounded-md bg-muted/50 px-2 py-1.5 text-2xs leading-5 text-foreground/80">
            {item.appunti}
          </p>
        ) : null}
      </div>
    </Wrapper>
  );
}

function buildSkillCompetenzeValues(workerRow: LavoratoreRecord): SkillCompetenzeValues {
  return {
    livello_pulizie: asString(workerRow.livello_pulizie),
    check_accetta_salire_scale_o_soffitti_alti: asString(
      workerRow.check_accetta_salire_scale_o_soffitti_alti
    ),
    compatibilita_famiglie_numerose: asString(workerRow.compatibilita_famiglie_numerose),
    compatibilita_famiglie_molto_esigenti: asString(
      workerRow.compatibilita_famiglie_molto_esigenti
    ),
    compatibilita_lavoro_con_datore_presente_in_casa: asString(
      workerRow.compatibilita_lavoro_con_datore_presente_in_casa
    ),
    compatibilita_con_case_di_grandi_dimensioni: asString(
      workerRow.compatibilita_con_case_di_grandi_dimensioni
    ),
    compatibilita_con_elevata_autonomia_richiesta: asString(
      workerRow.compatibilita_con_elevata_autonomia_richiesta
    ),
    compatibilita_con_contesti_pacati: asString(workerRow.compatibilita_con_contesti_pacati),
    livello_stiro: asString(workerRow.livello_stiro),
    compatibilita_con_stiro_esigente: asString(workerRow.compatibilita_con_stiro_esigente),
    livello_cucina: asString(workerRow.livello_cucina),
    compatibilita_con_cucina_strutturata: asString(
      workerRow.compatibilita_con_cucina_strutturata
    ),
    livello_babysitting: asString(workerRow.livello_babysitting),
    check_accetta_babysitting_multipli_bambini: asString(
      workerRow.check_accetta_babysitting_multipli_bambini
    ),
    check_accetta_babysitting_neonati: asString(workerRow.check_accetta_babysitting_neonati),
    compatibilita_babysitting_neonati: asString(workerRow.compatibilita_babysitting_neonati),
    livello_dogsitting: asString(workerRow.livello_dogsitting),
    check_accetta_case_con_cani: asString(workerRow.check_accetta_case_con_cani),
    check_accetta_case_con_cani_grandi: asString(workerRow.check_accetta_case_con_cani_grandi),
    check_accetta_case_con_gatti: asString(workerRow.check_accetta_case_con_gatti),
    compatibilita_con_animali_in_casa: asString(workerRow.compatibilita_con_animali_in_casa),
    livello_giardinaggio: asString(workerRow.livello_giardinaggio),
    livello_italiano: asString(workerRow.livello_italiano),
    livello_inglese: asString(workerRow.livello_inglese),
  };
}

type Tone = "high" | "medium" | "low" | "neutral";

function toneBadgeClassName(tone: Tone) {
  if (tone === "high")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "low") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function SectionToneBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge variant="outline" className={toneBadgeClassName(tone)}>
      {label}
    </Badge>
  );
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getTravelTimeTone(minutes: number | null) {
  if (minutes == null) return { label: "N/D", tone: "neutral" as const };
  if (minutes <= 30) return { label: "Basso", tone: "high" as const };
  if (minutes <= 60) return { label: "Medio", tone: "medium" as const };
  return { label: "Alto", tone: "low" as const };
}

// FASE 5 BIS — indirizzo lavoratore (form-context). I valori sono le label DB
// (così i defaults da workerVia/... funzionano e onSave li passa a
// commitAddressField). Le chiavi testuali usano FieldInput; la provincia e la
// mobilita hanno wrapper locali che preservano i loro mapping bespoke.
type WorkerAddressDraft = {
  via: string;
  civico: string;
  cap: string;
  citta: string;
  provincia: string;
  citofono: string;
  come_ti_sposti: string[];
};

// FASE 5 BIS — indirizzo prova (form-context, instradato a commitFamilyAddressField).
type FamilyAddressDraft = {
  indirizzo_prova_provincia: string;
  indirizzo_prova_cap: string;
  indirizzo_prova_via: string;
  indirizzo_prova_civico: string;
  indirizzo_prova_comune: string;
  indirizzo_prova_citofono: string;
  indirizzo_prova_note: string;
};

// FASE 5 BIS — campi esperienza che alimentano ExperienceReferencesCard
// (presentazionale), instradati a onFieldSave via useController.
type ExperienceSummaryDraft = {
  anni_esperienza_colf: string;
  anni_esperienza_badante: string;
  anni_esperienza_babysitter: string;
  situazione_lavorativa_attuale: string;
};

// FASE 5 BIS — Select provincia lavoratore agganciata al form. Preserva il
// mapping valore-form ↔ "none" (campo vuoto) e value=value (sigla).
function FieldWorkerProvinciaSelect({
  name,
  options,
}: {
  name: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="Seleziona provincia" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// FASE 5 BIS — Select provincia indirizzo prova agganciata al form. Preserva
// l'originale: SelectItem value=label, "none" → campo vuoto.
function FieldFamilyProvinciaSelect({
  name,
  options,
  placeholder,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessuna provincia</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// FASE 5 BIS — Combobox multi "Mobilita" agganciata al form. Preserva la
// normalizzazione bespoke value↔label (normalizeLookupOptionValues per i chip;
// normalizeLookupDbLabels per il commit verso il DB).
function FieldMobilityCombobox({
  name,
  options,
  anchor,
}: {
  name: string;
  options: LookupOption[];
  anchor: React.RefObject<HTMLDivElement | null>;
}) {
  const { field } = useController({ name });
  const stored = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizeLookupOptionValues(stored, options)}
      onValueChange={(nextValues) =>
        field.onChange(
          normalizeLookupDbLabels(nextValues as string[], options),
        )
      }
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>
                  {getLookupOptionLabel(options, value)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Seleziona opzioni" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
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

function TravelTimeCard({
  workerRow,
  selectionRow,
  onPatchWorkerField,
  onPatchWorkerAddress,
  onPatchProcessField,
  workerVia,
  workerCivico,
  workerCap,
  workerCitta,
  workerProvincia,
  workerCitofono,
  familyAddress,
  familyCap,
  familyProvince,
  familyStreet,
  familyCivicNumber,
  familyCity,
  familyIntercom,
  familyAddressNote,
  provinceOptions = [],
  mobilityOptions = [],
  updatingProcessAddress = false,
}: {
  workerRow: LavoratoreRecord;
  selectionRow?: Record<string, unknown> | null;
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void;
  onPatchWorkerAddress?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono" | "note",
    value: string | null,
  ) => Promise<void>;
  workerVia?: string | null;
  workerCivico?: string | null;
  workerCap?: string | null;
  workerCitta?: string | null;
  workerProvincia?: string | null;
  workerCitofono?: string | null;
  onPatchProcessField?: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_civico"
      | "indirizzo_prova_comune"
      | "indirizzo_prova_citofono"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void> | void;
  familyAddress?: string | null;
  familyCap?: string | null;
  familyProvince?: string | null;
  familyStreet?: string | null;
  familyCivicNumber?: string | null;
  familyCity?: string | null;
  familyIntercom?: string | null;
  familyAddressNote?: string | null;
  provinceOptions?: LookupOption[];
  mobilityOptions?: LookupOption[];
  updatingProcessAddress?: boolean;
}) {
  const travelMinutes = toNumber(
    selectionRow?.travel_time_tra_cap as string | number | null | undefined
  );
  const roundedTravelMinutes =
    travelMinutes != null ? Math.round(travelMinutes) : null;
  const [isEditing, setIsEditing] = React.useState(false);
  const mobilityAnchor = useComboboxAnchor();

  const workerProvincieOptions = useProvincieOptions();

  const commitAddressField = React.useCallback(
    async (
      field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
      rawValue: string,
    ) => {
      const nextValue = rawValue.trim();
      if (!onPatchWorkerAddress) return;
      const dbField = field === "provincia" ? "provincia_sigla" : field;
      await onPatchWorkerAddress(dbField as typeof field, nextValue || null);
    },
    [onPatchWorkerAddress],
  );

  const commitFamilyAddressField = React.useCallback(
    async (
      field:
        | "indirizzo_prova_provincia"
        | "indirizzo_prova_cap"
        | "indirizzo_prova_via"
        | "indirizzo_prova_civico"
        | "indirizzo_prova_comune"
        | "indirizzo_prova_citofono"
        | "indirizzo_prova_note",
      rawValue: string,
    ) => {
      if (!onPatchProcessField) return;
      const nextValue = rawValue.trim();
      const currentValue =
        field === "indirizzo_prova_provincia"
          ? asString(familyProvince)
          : field === "indirizzo_prova_cap"
            ? asString(familyCap)
          : field === "indirizzo_prova_via"
            ? asString(familyAddress)
            : field === "indirizzo_prova_civico"
              ? asString(familyCivicNumber)
              : field === "indirizzo_prova_comune"
                ? asString(familyCity)
                : field === "indirizzo_prova_citofono"
                  ? asString(familyIntercom)
              : asString(familyAddressNote);
      if (nextValue === currentValue) return;
      await onPatchProcessField(field, nextValue || null);
    },
    [
      familyAddress,
      familyAddressNote,
      familyCap,
      familyCivicNumber,
      familyCity,
      familyIntercom,
      familyProvince,
      onPatchProcessField,
    ],
  );

  const handleMobilitaChange = React.useCallback(
    async (values: string[]) => {
      const nextValues = values.map((item) => item.trim()).filter(Boolean);
      if (!onPatchWorkerField) return;
      const currentValues = readArrayStrings(workerRow.come_ti_sposti);
      if (JSON.stringify(nextValues) === JSON.stringify(currentValues)) return;
      await onPatchWorkerField(
        "come_ti_sposti",
        nextValues.length > 0 ? nextValues : null,
      );
    },
    [onPatchWorkerField, workerRow.come_ti_sposti],
  );

  // FASE 5 BIS — form indirizzo lavoratore + mobilita. I defaults sono i valori
  // server (le stesse init dei vecchi draft). onSave instrada ogni chiave
  // cambiata a commitAddressField (testi + provincia) o handleMobilitaChange
  // (come_ti_sposti). Il resync senza-clobber è gestito da keepDirtyValues.
  const workerForm = useAutoSaveForm<WorkerAddressDraft>({
    defaults: {
      via: asString(workerVia),
      civico: asString(workerCivico),
      cap: asString(workerCap),
      citta: asString(workerCitta),
      provincia: asString(workerProvincia),
      citofono: asString(workerCitofono),
      come_ti_sposti: readArrayStrings(workerRow.come_ti_sposti),
    },
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === "come_ti_sposti") {
          await handleMobilitaChange(
            Array.isArray(value) ? (value as string[]) : [],
          );
        } else {
          await commitAddressField(
            key as "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
            (value as string) ?? "",
          );
        }
      }
    },
  });

  // FASE 5 BIS — form indirizzo prova (process). onSave instrada ogni chiave a
  // commitFamilyAddressField (che preserva il guard no-op verso il valore server).
  const familyForm = useAutoSaveForm<FamilyAddressDraft>({
    defaults: {
      indirizzo_prova_provincia: asString(familyProvince),
      indirizzo_prova_cap: asString(familyCap),
      indirizzo_prova_via: asString(familyStreet),
      indirizzo_prova_civico: asString(familyCivicNumber),
      indirizzo_prova_comune: asString(familyCity),
      indirizzo_prova_citofono: asString(familyIntercom),
      indirizzo_prova_note: asString(familyAddressNote),
    },
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        await commitFamilyAddressField(
          key as keyof FamilyAddressDraft,
          (value as string) ?? "",
        );
      }
    },
  });

  const travelTone = getTravelTimeTone(travelMinutes);
  const mobility = readArrayStrings(workerRow.come_ti_sposti);
  const travelTimeLabel =
    roundedTravelMinutes != null
      ? `${roundedTravelMinutes} min`
      : "Non dichiarato";
  const familyAddressFields: Array<{
    label: string;
    name: keyof FamilyAddressDraft;
    type?: "province";
  }> = [
    {
      label: "Provincia",
      name: "indirizzo_prova_provincia",
      type: "province",
    },
    { label: "CAP", name: "indirizzo_prova_cap" },
    { label: "Via", name: "indirizzo_prova_via" },
    { label: "Civico", name: "indirizzo_prova_civico" },
    { label: "Comune", name: "indirizzo_prova_comune" },
    { label: "Citofono", name: "indirizzo_prova_citofono" },
    { label: "Nota", name: "indirizzo_prova_note" },
  ];

  return (
    <DetailSectionBlock
      title="Travel time"
      icon={<Clock3Icon className="text-muted-foreground size-4" />}
      collapsible
      action={
        <div className="flex items-center gap-2">
          <SectionToneBadge label={travelTone.label} tone={travelTone.tone} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica travel time"
                : "Modifica travel time"
            }
            title={
              isEditing
                ? "Termina modifica travel time"
                : "Modifica travel time"
            }
            onClick={() => setIsEditing((current) => !current)}
          >
            <PencilIcon />
          </Button>
        </div>
      }
      contentClassName="space-y-4"
    >
      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Tempo di viaggio dichiarato
        </p>
        {roundedTravelMinutes != null ? (
          <p className="text-foreground font-medium">{travelTimeLabel}</p>
        ) : (
          <p className="text-muted-foreground">Non dichiarato</p>
        )}
      </div>

      <Form {...workerForm}>
        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Indirizzo lavoratore
          </p>
          {isEditing ? (
            <div className="grid gap-2">
              {(
                [
                  { key: "provincia" as const, label: "Provincia" },
                  { key: "cap" as const, label: "CAP" },
                  { key: "via" as const, label: "Via" },
                  { key: "civico" as const, label: "Civico" },
                  { key: "citta" as const, label: "Comune" },
                  { key: "citofono" as const, label: "Citofono" },
                ] as Array<{
                  key: "provincia" | "cap" | "via" | "civico" | "citta" | "citofono";
                  label: string;
                }>
              ).map((item) => (
                <label key={item.key} className="grid gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {item.label}
                  </span>
                  {item.key === "provincia" ? (
                    <FieldWorkerProvinciaSelect
                      name="provincia"
                      options={workerProvincieOptions}
                    />
                  ) : (
                    <FieldInput
                      name={item.key}
                      className="h-9 text-sm"
                      placeholder={item.label}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p>
              {[workerVia, workerCivico, workerCap, workerCitta, workerProvincia]
                .map((v) => (typeof v === "string" ? v.trim() : ""))
                .filter((v) => v && v !== "-")
                .join(" • ") || "-"}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Mobilita
          </p>
          {isEditing ? (
            <FieldMobilityCombobox
              name="come_ti_sposti"
              options={mobilityOptions}
              anchor={mobilityAnchor}
            />
          ) : mobility.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mobility.map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <p>-</p>
          )}
        </div>
      </Form>

      <Form {...familyForm}>
        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            Indirizzo prova
          </p>
          {isEditing ? (
            <div className="grid gap-2">
              {familyAddressFields.map((item) => (
                <label key={item.name} className="grid gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {item.label}
                  </span>
                  {item.type === "province" ? (
                    <FieldFamilyProvinciaSelect
                      name={item.name}
                      options={provinceOptions}
                      placeholder={item.label}
                      disabled={updatingProcessAddress}
                    />
                  ) : (
                    <FieldInput
                      name={item.name}
                      className="h-9 text-sm"
                      placeholder={item.label}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p>
              {[
                familyProvince,
                familyCap,
                familyStreet || familyAddress,
                familyCivicNumber,
                familyCity,
                asString(familyIntercom) && asString(familyIntercom) !== "-"
                  ? `Citofono ${familyIntercom}`
                  : null,
                familyAddressNote,
              ]
                .map((value) => (typeof value === "string" ? value.trim() : ""))
                .filter((value) => value && value !== "-")
                .join(" • ") || "-"}
            </p>
          )}
        </div>
      </Form>
    </DetailSectionBlock>
  );
}

function ExperienceBlock({
  workerRow,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  tipoLavoroOptions,
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  references,
  referencesLoading = false,
  isEditing,
  onToggleEdit,
  isUpdating,
  jobSearchDraft,
  onJobSearchDraftChange,
  onJobSearchFieldPatch,
  onFieldSave,
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerRow: LavoratoreRecord;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  tipoLavoroOptions: LookupOption[];
  referenceStatusOptions: LookupOption[];
  experiences: EsperienzaLavoratoreRecord[];
  experiencesLoading?: boolean;
  isGeneratingAiSummary?: boolean;
  onGenerateAiSummary?: () => Promise<void> | void;
  references: ReferenzaLavoratoreRecord[];
  referencesLoading?: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  isUpdating: boolean;
  draft: {
    anni_esperienza_colf: string;
    anni_esperienza_badante: string;
    anni_esperienza_babysitter: string;
    situazione_lavorativa_attuale: string;
  };
  jobSearchDraft: {
    tipo_lavoro_domestico: string[];
  };
  onDraftChange: (
    patch: Partial<{
      anni_esperienza_colf: string;
      anni_esperienza_badante: string;
      anni_esperienza_babysitter: string;
      situazione_lavorativa_attuale: string;
    }>,
  ) => void;
  onJobSearchDraftChange: WorkerPipelineSummaryCardsProps["onJobSearchDraftChange"];
  onJobSearchFieldPatch: WorkerPipelineSummaryCardsProps["onJobSearchFieldPatch"];
  onFieldSave: (field: string, value: string) => void;
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceCreate: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceDelete: (experienceId: string) => Promise<void> | void;
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
}) {
  // FASE 5 BIS — i campi esperienza alimentano ExperienceReferencesCard
  // (presentazionale, value/onChange). Agganciati al form via useController:
  // field.onChange emette un vero "change" -> autosave (a differenza di setValue).
  const experienceForm = useAutoSaveForm<ExperienceSummaryDraft>({
    defaults: {
      anni_esperienza_colf: asInputValue(workerRow.anni_esperienza_colf),
      anni_esperienza_badante: asInputValue(workerRow.anni_esperienza_badante),
      anni_esperienza_babysitter: asInputValue(
        workerRow.anni_esperienza_babysitter,
      ),
      situazione_lavorativa_attuale: asString(
        workerRow.situazione_lavorativa_attuale,
      ),
    },
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        onFieldSave(key, typeof rawValue === "string" ? rawValue : "");
      }
    },
  });
  const colfCtrl = useController({
    name: "anni_esperienza_colf",
    control: experienceForm.control,
  });
  const badanteCtrl = useController({
    name: "anni_esperienza_badante",
    control: experienceForm.control,
  });
  const babysitterCtrl = useController({
    name: "anni_esperienza_babysitter",
    control: experienceForm.control,
  });
  const situazioneCtrl = useController({
    name: "situazione_lavorativa_attuale",
    control: experienceForm.control,
  });
  const colfValue = colfCtrl.field.value;
  const badanteValue = badanteCtrl.field.value;
  const babysitterValue = babysitterCtrl.field.value;
  const situazioneValue = situazioneCtrl.field.value;

  return (
    <ExperienceReferencesCard
      workerId={workerRow.id}
      title="Esperienza"
      isEditing={isEditing}
      showEditAction
      showCreateExperienceAction={isEditing}
      collapsible
      isUpdating={isUpdating}
      experiences={experiences}
      experiencesLoading={experiencesLoading}
      aiSummaryValue={asString(workerRow.riassunto_profilo_breve)}
      isGeneratingAiSummary={isGeneratingAiSummary}
      onGenerateAiSummary={onGenerateAiSummary}
      references={references}
      referencesLoading={referencesLoading}
      lookupColorsByDomain={lookupColorsByDomain}
      experienceTipoLavoroOptions={experienceTipoLavoroOptions}
      experienceTipoRapportoOptions={experienceTipoRapportoOptions}
      referenceStatusOptions={referenceStatusOptions}
      selectedAnniEsperienzaColf={colfValue}
      selectedAnniEsperienzaBadante={badanteValue}
      selectedAnniEsperienzaBabysitter={babysitterValue}
      selectedSituazioneLavorativaAttuale={situazioneValue}
      onToggleEdit={onToggleEdit}
      onAnniEsperienzaColfChange={colfCtrl.field.onChange}
      onAnniEsperienzaBadanteChange={badanteCtrl.field.onChange}
      onAnniEsperienzaBabysitterChange={babysitterCtrl.field.onChange}
      onSituazioneLavorativaAttualeChange={situazioneCtrl.field.onChange}
      onExperiencePatch={onExperiencePatch}
      onExperienceCreate={onExperienceCreate}
      onExperienceDelete={onExperienceDelete}
      onReferencePatch={onReferencePatch}
      onReferenceCreate={onReferenceCreate}
    >
      <WorkerShiftPreferencesFields
        fields={[
          {
            id: "ricerca-tipo-lavoro-domestico",
            label: "Tipo di lavoro",
            domain: "lavoratori.tipo_lavoro_domestico",
            value: isEditing
              ? jobSearchDraft.tipo_lavoro_domestico
              : readArrayStrings(workerRow.tipo_lavoro_domestico),
            options: tipoLavoroOptions,
            placeholder: "Seleziona tipo lavoro",
            onChange: (values) => {
              onJobSearchDraftChange({ tipo_lavoro_domestico: values });
              void onJobSearchFieldPatch(
                "tipo_lavoro_domestico",
                values.length > 0 ? values : null,
              );
            },
          },
        ]}
        isEditing={isEditing}
        isUpdating={isUpdating}
        lookupColorsByDomain={lookupColorsByDomain}
      />
    </ExperienceReferencesCard>
  );
}

function AvailabilityCard({
  availabilityTitleMeta,
  familyAvailabilityJson,
  familyWorkSchedule,
  familyWeeklyFrequency,
  processWeeklyHours,
  tipoRapportoOptions,
  tipoRapportoValues,
  onTipoRapportoChange,
  isEditing,
  onToggleEdit,
  isUpdating,
  lookupColorsByDomain,
  lavoriAccettabili,
  lavoriAccettabiliOptions,
  matrix,
  readOnlyRows,
  vincoliOrari,
  onLavoriAccettabiliChange,
  onMatrixChange,
  onVincoliChange,
  onSave,
}: {
  availabilityTitleMeta: string;
  familyAvailabilityJson?: string | null;
  familyWorkSchedule?: string | null;
  familyWeeklyFrequency?: string | null;
  processWeeklyHours?: string | null;
  tipoRapportoOptions: LookupOption[];
  tipoRapportoValues: string[];
  onTipoRapportoChange: (values: string[]) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  lavoriAccettabili: string[];
  lavoriAccettabiliOptions: LookupOption[];
  matrix: Record<string, boolean>;
  readOnlyRows: Array<{ day: string; activeByHour: boolean[] }>;
  vincoliOrari: string;
  onLavoriAccettabiliChange: (values: string[]) => void;
  onMatrixChange: (
    dayField: AvailabilityEditDayField,
    bandField: AvailabilityEditBandField,
    checked: boolean,
  ) => void;
  onVincoliChange: (value: string) => void;
  onSave: () => void;
}) {
  const familyRequestsText = React.useMemo(() => {
    const schedule =
      familyWorkSchedule && familyWorkSchedule !== "-"
        ? familyWorkSchedule
        : null;
    const weeklyHours =
      processWeeklyHours && processWeeklyHours !== "-"
        ? `${processWeeklyHours}h`
        : null;
    const weeklyDays =
      familyWeeklyFrequency && familyWeeklyFrequency !== "-"
        ? `${familyWeeklyFrequency}g /settimana`
        : null;
    const cadence = [weeklyHours, weeklyDays]
      .filter((item): item is string => Boolean(item))
      .join(" | ");

    if (schedule && cadence) return `${schedule} • ${cadence}`;
    if (schedule) return schedule;
    if (cadence) return cadence;
    return "";
  }, [familyWeeklyFrequency, familyWorkSchedule, processWeeklyHours]);

  const familyAvailabilityRows = React.useMemo(() => {
    const familyPayload = parseAvailabilityPayload(familyAvailabilityJson);
    if (!familyPayload?.weekly) return [];
    return Object.keys(AVAILABILITY_DAY_LABELS)
      .slice(0, 6)
      .map((day) => {
        const typedDay = day as keyof typeof AVAILABILITY_DAY_LABELS;
        const slots = readAvailabilitySlots(familyPayload.weekly, typedDay);
        return {
          day: AVAILABILITY_DAY_LABELS[typedDay],
          activeByHour: AVAILABILITY_HOUR_LABELS.map((hourLabel) =>
            isAvailabilityHourActive(slots, hourLabel),
          ),
        };
      });
  }, [familyAvailabilityJson]);

  return (
    <AvailabilityCalendarCard
      titleMeta={availabilityTitleMeta}
      isEditing={isEditing}
      showEditAction
      collapsible
      isUpdating={isUpdating}
      editDays={AVAILABILITY_EDIT_DAYS.map(({ field, label }) => ({
        field,
        label,
      }))}
      editBands={AVAILABILITY_EDIT_BANDS.map(({ field, label }) => ({
        field,
        label,
      }))}
      hourLabels={AVAILABILITY_HOUR_LABELS}
      readOnlyRows={readOnlyRows}
      comparisonRows={familyAvailabilityRows}
      familyRequestsText={familyRequestsText}
      matrix={matrix}
      vincoliOrari={vincoliOrari}
      onToggleEdit={onToggleEdit}
      onMatrixChange={(dayField, bandField, checked) =>
        onMatrixChange(
          dayField as AvailabilityEditDayField,
          bandField as AvailabilityEditBandField,
          checked
        )
      }
      onVincoliChange={onVincoliChange}
      onSave={onSave}
    >
      <WorkerShiftPreferencesFields
        fields={[
          {
            id: "ricerca-tipo-rapporto-lavorativo",
            label: "Tipo di rapporto",
            domain: "lavoratori.tipo_rapporto_lavorativo",
            value: tipoRapportoValues,
            options: tipoRapportoOptions,
            placeholder: "Seleziona tipo rapporto",
            onChange: onTipoRapportoChange,
          },
          {
            id: "ricerca-lavori-accettabili",
            label: "Lavori accettabili",
            domain: "lavoratori.check_lavori_accettabili",
            value: lavoriAccettabili,
            options: lavoriAccettabiliOptions,
            placeholder: "Seleziona lavori",
            onChange: onLavoriAccettabiliChange,
            sortByOptionOrder: true,
          },
        ]}
        isEditing={isEditing}
        isUpdating={isUpdating}
        lookupColorsByDomain={lookupColorsByDomain}
      />
    </AvailabilityCalendarCard>
  );
}

type PreferenceFieldConfig = {
  field:
    | "check_accetta_funzionamento_baze"
    | "check_accetta_lavori_con_trasferta"
    | "check_accetta_multipli_contratti"
    | "check_accetta_paga_9_euro_netti";
  label: string;
  domain: string;
  value: string;
  options: LookupOption[];
};

function AcceptPreferenceField({
  field: fieldName,
  label,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  draftValue,
  selectedValue,
  options,
  onChange,
}: PreferenceFieldConfig & {
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  draftValue: string;
  selectedValue: string;
  onChange: (field: PreferenceFieldConfig["field"], value: string) => void;
}) {
  const value = isEditing ? draftValue : selectedValue;

  return (
    <div className="space-y-1.5">
      <p className={cn("text-muted-foreground text-[10px] font-medium uppercase tracking-wider")}>{label}</p>
      {isEditing ? (
        <RadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(fieldName, nextValue)}
          className="gap-2"
          disabled={isUpdating}
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={option.label} />
              <span
                className={`inline-flex items-center gap-1 rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                  resolveLookupColor(lookupColorsByDomain, domain, option.label),
                )}`}
              >
                {option.label === "Accetta" ? (
                  <CheckIcon className="size-3.5" />
                ) : option.label === "Non accetta" ? (
                  <XIcon className="size-3.5" />
                ) : null}
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      ) : value ? (
        <Badge
          variant="outline"
          className={getTagClassName(
            resolveLookupColor(lookupColorsByDomain, domain, value),
          )}
        >
          {value === "Accetta" ? (
            <CheckIcon className="size-3.5" />
          ) : value === "Non accetta" ? (
            <XIcon className="size-3.5" />
          ) : null}
          {value}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )}
    </div>
  );
}

function PreferencesConstraintsCard({
  workerRow,
  isEditing,
  onToggleEdit,
  isUpdating,
  draft,
  lookupColorsByDomain,
  funzionamentoBazeOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  onDraftChange,
  onFieldPatch,
}: {
  workerRow: LavoratoreRecord;
  isEditing: boolean;
  onToggleEdit: () => void;
  isUpdating: boolean;
  draft: {
    check_accetta_funzionamento_baze: string;
    check_accetta_lavori_con_trasferta: string;
    check_accetta_multipli_contratti: string;
    check_accetta_paga_9_euro_netti: string;
  };
  lookupColorsByDomain: Map<string, string>;
  funzionamentoBazeOptions: LookupOption[];
  trasfertaOptions: LookupOption[];
  multipliContrattiOptions: LookupOption[];
  paga9Options: LookupOption[];
  onDraftChange: WorkerPipelineSummaryCardsProps["onJobSearchDraftChange"];
  onFieldPatch: WorkerPipelineSummaryCardsProps["onJobSearchFieldPatch"];
}) {
  const fields: PreferenceFieldConfig[] = [
    {
      field: "check_accetta_funzionamento_baze",
      label: "Accetta il funzionamento Baze?",
      domain: "lavoratori.check_accetta_funzionamento_baze",
      value: asString(workerRow.check_accetta_funzionamento_baze),
      options: funzionamentoBazeOptions,
    },
    {
      field: "check_accetta_lavori_con_trasferta",
      label: "Accetta lavori con trasferte?",
      domain: "lavoratori.check_accetta_lavori_con_trasferta",
      value: asString(workerRow.check_accetta_lavori_con_trasferta),
      options: trasfertaOptions,
    },
    {
      field: "check_accetta_multipli_contratti",
      label: "Accetta di fare piu contratti?",
      domain: "lavoratori.check_accetta_multipli_contratti",
      value: asString(workerRow.check_accetta_multipli_contratti),
      options: multipliContrattiOptions,
    },
    {
      field: "check_accetta_paga_9_euro_netti",
      label: "Accetta la paga di 9 euro netti l'ora in regola?",
      domain: "lavoratori.check_accetta_paga_9_euro_netti",
      value: asString(workerRow.check_accetta_paga_9_euro_netti),
      options: paga9Options,
    },
  ];

  function handleChange(field: PreferenceFieldConfig["field"], value: string) {
    onDraftChange({ [field]: value });
    void onFieldPatch(field, value);
  }

  return (
    <DetailSectionBlock
      title="Preferenze e vincoli"
      icon={<SlidersHorizontalIcon className="text-muted-foreground size-4" />}
      collapsible
      defaultOpen={false}
      action={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            isEditing
              ? "Termina modifica preferenze e vincoli"
              : "Modifica preferenze e vincoli"
          }
          title={
            isEditing
              ? "Termina modifica preferenze e vincoli"
              : "Modifica preferenze e vincoli"
          }
          onClick={onToggleEdit}
          disabled={isUpdating}
        >
          <PencilIcon />
        </Button>
      }
      contentClassName="grid gap-4"
    >
      {fields.map((field) => (
        <AcceptPreferenceField
          key={field.field}
          {...field}
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          draftValue={draft[field.field]}
          selectedValue={field.value}
          onChange={handleChange}
        />
      ))}
    </DetailSectionBlock>
  );
}

function RelatedActiveSearchesBlock({
  groups,
  loading = false,
  onOpenSearch,
}: {
  groups: RelatedSearchGroups;
  loading?: boolean;
  onOpenSearch?: (processId: string, selectionId: string) => void;
}) {
  const groupedDirectItems = React.useMemo(() => {
    const grouped = new Map<string, RelatedActiveSearchItem[]>();

    for (const item of groups.direct) {
      const groupKey = item.statoRicerca || "Senza stato";
      const currentItems = grouped.get(groupKey) ?? [];
      currentItems.push(item);
      grouped.set(groupKey, currentItems);
    }

    return Array.from(grouped.entries());
  }, [groups.direct]);

  const groupedOtherItems = React.useMemo(() => {
    const grouped = new Map<string, RelatedActiveSearchItem[]>();

    for (const item of groups.other) {
      const groupKey = item.statoRicerca || "Senza stato";
      const currentItems = grouped.get(groupKey) ?? [];
      currentItems.push(item);
      grouped.set(groupKey, currentItems);
    }

    return Array.from(grouped.entries());
  }, [groups.other]);

  const renderGroups = (
    groupedItems: Array<[string, RelatedActiveSearchItem[]]>,
    emptyLabel: string,
  ) => {
    if (groupedItems.length === 0) {
      return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
    }

    return groupedItems.map(([groupLabel, groupItems]) => (
      <div key={groupLabel} className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted/40 text-foreground">
            {groupLabel}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {groupItems.length} {groupItems.length === 1 ? "ricerca" : "ricerche"}
          </span>
        </div>

        <div className="space-y-3">
          {groupItems.map((item) => (
            <RelatedActiveSearchCard
              key={item.selectionId}
              item={item}
              onOpenSearch={onOpenSearch}
            />
          ))}
        </div>
      </div>
    ));
  };

  return (
    <DetailSectionBlock
      title="Ricerche coinvolte"
      icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
      collapsible
      contentClassName="space-y-3"
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">Caricamento ricerche coinvolte...</p>
      ) : groups.direct.length === 0 && groups.other.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna ricerca coinvolta.</p>
      ) : (
        <Tabs defaultValue="direct" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="gap-2">
              Coinvolto direttamente
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                {groups.direct.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-2">
              Tutte le altre ricerche
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                {groups.other.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="mt-0 space-y-3">
            {renderGroups(groupedDirectItems, "Nessun coinvolgimento diretto.")}
          </TabsContent>
          <TabsContent value="other" className="mt-0 space-y-3">
            {renderGroups(groupedOtherItems, "Nessuna altra ricerca.")}
          </TabsContent>
        </Tabs>
      )}
    </DetailSectionBlock>
  );
}

export function WorkerPipelineSummaryCards({
  workerRow,
  selectionRow,
  relatedActiveSearches,
  relatedActiveSearchesLoading = false,
  onOpenRelatedSearch,
  onPatchWorkerField,
  onPatchWorkerAddress,
  onPatchProcessField,
  workerVia,
  workerCivico,
  workerCap,
  workerCitta,
  workerProvincia,
  workerCitofono,
  processWeeklyHours,
  familyAddress,
  familyCap,
  familyProvince,
  familyStreet,
  familyCivicNumber,
  familyCity,
  familyIntercom,
  familyAddressNote,
  familyAvailabilityJson,
  familyWorkSchedule,
  familyWeeklyFrequency,
  provinceOptions = [],
  updatingProcessAddress = false,
  availabilityTitleMeta,
  availabilityReadOnlyRows,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  tipoLavoroOptions,
  tipoRapportoOptions,
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  references,
  referencesLoading = false,
  documents,
  documentsLoading = false,
  isEditingAvailability,
  onToggleAvailabilityEdit,
  updatingAvailability,
  isEditingJobSearch,
  onToggleJobSearchEdit,
  updatingJobSearch,
  jobSearchDraft,
  funzionamentoBazeOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  onJobSearchDraftChange,
  onJobSearchFieldPatch,
  lavoriAccettabili,
  lavoriAccettabiliOptions,
  availabilityMatrix,
  availabilityVincoli,
  onLavoriAccettabiliChange,
  onAvailabilityMatrixChange,
  onAvailabilityVincoliChange,
  onAvailabilitySave,
  isEditingExperience,
  onToggleExperienceEdit,
  updatingExperience,
  experienceDraft,
  onExperienceDraftChange,
  onExperienceFieldSave,
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
  isEditingSkills,
  onToggleSkillsEdit,
  updatingSkills,
  skillsDraft,
  onSkillsDraftChange,
  onSkillsFieldPatch,
  isEditingDocuments,
  onToggleDocumentsEdit,
  updatingDocuments,
  documentsDraft,
  resolvedIban,
  documentiVerificatiOptions,
  documentiInRegolaOptions,
  onDocumentVerificationChange,
  onDocumentStatusChange,
  naspiInputValue,
  ibanInputValue,
  stripeAccountInputValue,
  onDocumentNaspiChange,
  onDocumentIbanChange,
  onDocumentStripeAccountChange,
  onDocumentUpsert,
  onDocumentUploadError,
}: WorkerPipelineSummaryCardsProps) {
  const selectedSkillCompetenzeValues = React.useMemo(
    () => buildSkillCompetenzeValues(workerRow),
    [workerRow]
  );

  return (
    <React.Fragment>
      <TravelTimeCard
        workerRow={workerRow}
        selectionRow={selectionRow}
        onPatchWorkerField={onPatchWorkerField}
        onPatchWorkerAddress={onPatchWorkerAddress}
        onPatchProcessField={onPatchProcessField}
        workerVia={workerVia}
        workerCivico={workerCivico}
        workerCap={workerCap}
        workerCitta={workerCitta}
        workerProvincia={workerProvincia}
        workerCitofono={workerCitofono}
        familyAddress={familyAddress}
        familyCap={familyCap}
        familyProvince={familyProvince}
        familyStreet={familyStreet}
        familyCivicNumber={familyCivicNumber}
        familyCity={familyCity}
        familyIntercom={familyIntercom}
        familyAddressNote={familyAddressNote}
        provinceOptions={provinceOptions}
        mobilityOptions={lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? []}
        updatingProcessAddress={updatingProcessAddress}
      />
      <ExperienceBlock
        workerRow={workerRow}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        tipoLavoroOptions={tipoLavoroOptions}
        referenceStatusOptions={referenceStatusOptions}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        isGeneratingAiSummary={isGeneratingAiSummary}
        onGenerateAiSummary={onGenerateAiSummary}
        references={references}
        referencesLoading={referencesLoading}
        isEditing={isEditingExperience}
        onToggleEdit={onToggleExperienceEdit}
        isUpdating={updatingExperience}
        draft={experienceDraft}
        jobSearchDraft={{
          tipo_lavoro_domestico: jobSearchDraft.tipo_lavoro_domestico,
        }}
        onDraftChange={onExperienceDraftChange}
        onJobSearchDraftChange={onJobSearchDraftChange}
        onJobSearchFieldPatch={onJobSearchFieldPatch}
        onFieldSave={onExperienceFieldSave}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onExperienceDelete={onExperienceDelete}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
      <RelatedActiveSearchesBlock
        groups={relatedActiveSearches}
        loading={relatedActiveSearchesLoading}
        onOpenSearch={onOpenRelatedSearch}
      />
      <AvailabilityCard
        availabilityTitleMeta={availabilityTitleMeta}
        familyAvailabilityJson={familyAvailabilityJson}
        familyWorkSchedule={familyWorkSchedule}
        familyWeeklyFrequency={familyWeeklyFrequency}
        processWeeklyHours={processWeeklyHours}
        tipoRapportoOptions={tipoRapportoOptions}
        tipoRapportoValues={
          isEditingAvailability
            ? jobSearchDraft.tipo_rapporto_lavorativo
            : readArrayStrings(workerRow.tipo_rapporto_lavorativo)
        }
        onTipoRapportoChange={(values) => {
          onJobSearchDraftChange({ tipo_rapporto_lavorativo: values });
          void onJobSearchFieldPatch(
            "tipo_rapporto_lavorativo",
            values.length > 0 ? values : null,
          );
        }}
        isEditing={isEditingAvailability}
        onToggleEdit={onToggleAvailabilityEdit}
        isUpdating={updatingAvailability}
        lookupColorsByDomain={lookupColorsByDomain}
        lavoriAccettabili={lavoriAccettabili}
        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
        matrix={availabilityMatrix}
        readOnlyRows={availabilityReadOnlyRows}
        vincoliOrari={availabilityVincoli}
        onLavoriAccettabiliChange={onLavoriAccettabiliChange}
        onMatrixChange={onAvailabilityMatrixChange}
        onVincoliChange={onAvailabilityVincoliChange}
        onSave={onAvailabilitySave}
      />
      <PreferencesConstraintsCard
        workerRow={workerRow}
        isEditing={isEditingJobSearch}
        onToggleEdit={onToggleJobSearchEdit}
        isUpdating={updatingJobSearch}
        draft={jobSearchDraft}
        lookupColorsByDomain={lookupColorsByDomain}
        funzionamentoBazeOptions={funzionamentoBazeOptions}
        trasfertaOptions={trasfertaOptions}
        multipliContrattiOptions={multipliContrattiOptions}
        paga9Options={paga9Options}
        onDraftChange={onJobSearchDraftChange}
        onFieldPatch={onJobSearchFieldPatch}
      />
      <SkillsCompetenzeCard
        isEditing={isEditingSkills}
        isUpdating={updatingSkills}
        collapsible
        draft={skillsDraft}
        selectedValues={selectedSkillCompetenzeValues}
        lookupOptionsByDomain={lookupOptionsByDomain}
        lookupColorsByDomain={lookupColorsByDomain}
        onToggleEdit={onToggleSkillsEdit}
        onFieldChange={(field, value) => {
          onSkillsDraftChange({ [field]: value });
          void onSkillsFieldPatch(field, value);
        }}
      />
      <DocumentsCard
        workerId={asString(workerRow.id) || null}
        isEditing={isEditingDocuments}
        isUpdating={updatingDocuments}
        draft={documentsDraft}
        selectedValues={{
          stato_verifica_documenti: asString(workerRow.stato_verifica_documenti),
          documenti_in_regola: asString(workerRow.documenti_in_regola),
          data_scadenza_naspi: asString(workerRow.data_scadenza_naspi),
        }}
        documents={documents}
        documentsLoading={documentsLoading}
        verificationOptions={documentiVerificatiOptions}
        statoDocumentiOptions={documentiInRegolaOptions}
        lookupColorsByDomain={lookupColorsByDomain}
        administrativeValues={{
          iban: resolvedIban,
          id_stripe_account: asString(workerRow.id_stripe_account),
        }}
        naspiInputValue={naspiInputValue}
        ibanInputValue={ibanInputValue}
        stripeAccountInputValue={stripeAccountInputValue}
        onToggleEdit={onToggleDocumentsEdit}
        onVerificationChange={onDocumentVerificationChange}
        onStatoDocumentiChange={onDocumentStatusChange}
        onNaspiChange={onDocumentNaspiChange}
        onIbanChange={onDocumentIbanChange}
        onStripeAccountChange={onDocumentStripeAccountChange}
        onDocumentUpsert={onDocumentUpsert}
        onUploadError={onDocumentUploadError}
        collapsible
        defaultOpen={false}
      />
    </React.Fragment>
  );
}
