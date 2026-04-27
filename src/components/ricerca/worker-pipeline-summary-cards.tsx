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

import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import { Badge } from "@/components/ui-next/badge";
import { Button } from "@/components/ui-next/button";
import { Input } from "@/components/ui-next/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui-next/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_HOUR_LABELS,
  AVAILABILITY_VISIBLE_DAY_ORDER,
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
  getTagClassName,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils";
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles";

type WorkerPipelineSummaryCardsProps = {
  workerRow: LavoratoreRecord;
  selectionRow?: Record<string, unknown> | null;
  relatedActiveSearches: RelatedActiveSearchItem[];
  relatedActiveSearchesLoading?: boolean;
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void;
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void;
  onPatchProcessField?: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void> | void;
  processWeeklyHours?: string | null;
  familyAddress?: string | null;
  familyCap?: string | null;
  familyProvince?: string | null;
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
  onAvailabilityVincoliBlur: () => void;
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
  onExperienceFieldBlur: (
    field:
      | "anni_esperienza_colf"
      | "anni_esperienza_badante"
      | "anni_esperienza_babysitter"
      | "situazione_lavorativa_attuale",
  ) => void;
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
  documentiVerificatiOptions: LookupOption[];
  documentiInRegolaOptions: LookupOption[];
  onDocumentVerificationChange: (value: string) => void;
  onDocumentStatusChange: (value: string) => void;
  onDocumentNaspiChange: (value: string) => void;
  onDocumentNaspiBlur: () => void;
  onDocumentIbanChange: (value: string) => void;
  onDocumentIbanBlur: () => void;
  onDocumentStripeAccountChange: (value: string) => void;
  onDocumentStripeAccountBlur: () => void;
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
          <p className="line-clamp-3 rounded-md bg-muted/50 px-2 py-1.5 text-[11px] leading-5 text-foreground/80">
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

function TravelTimeCard({
  workerRow,
  selectionRow,
  onPatchWorkerField,
  onPatchProcessField,
  processWeeklyHours,
  familyAddress,
  familyCap,
  familyProvince,
  familyAddressNote,
  provinceOptions = [],
  updatingProcessAddress = false,
}: {
  workerRow: LavoratoreRecord;
  selectionRow?: Record<string, unknown> | null;
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void;
  onPatchProcessField?: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void> | void;
  processWeeklyHours?: string | null;
  familyAddress?: string | null;
  familyCap?: string | null;
  familyProvince?: string | null;
  familyAddressNote?: string | null;
  provinceOptions?: LookupOption[];
  updatingProcessAddress?: boolean;
}) {
  const travelMinutes = toNumber(
    selectionRow?.travel_time_tra_cap as string | number | null | undefined
  );
  const roundedTravelMinutes =
    travelMinutes != null ? Math.round(travelMinutes) : null;
  const [isEditing, setIsEditing] = React.useState(false);
  const [addressDraft, setAddressDraft] = React.useState({
    provincia: asString(workerRow.provincia),
    cap: asString(workerRow.cap),
    indirizzo_residenza_completo: asString(
      workerRow.indirizzo_residenza_completo,
    ),
    mobilita: readArrayStrings(workerRow.come_ti_sposti).join(", "),
  });
  const [familyAddressDraft, setFamilyAddressDraft] = React.useState({
    provincia: asString(familyProvince),
    cap: asString(familyCap),
    indirizzo: asString(familyAddress),
    note: asString(familyAddressNote),
  });

  React.useEffect(() => {
    setAddressDraft({
      provincia: asString(workerRow.provincia),
      cap: asString(workerRow.cap),
      indirizzo_residenza_completo: asString(
        workerRow.indirizzo_residenza_completo,
      ),
      mobilita: readArrayStrings(workerRow.come_ti_sposti).join(", "),
    });
  }, [
    workerRow.provincia,
    workerRow.cap,
    workerRow.indirizzo_residenza_completo,
    workerRow.come_ti_sposti,
  ]);

  React.useEffect(() => {
    setFamilyAddressDraft({
      provincia: asString(familyProvince),
      cap: asString(familyCap),
      indirizzo: asString(familyAddress),
      note: asString(familyAddressNote),
    });
  }, [familyAddress, familyAddressNote, familyCap, familyProvince]);

  const commitAddressField = React.useCallback(
    async (
      field: "provincia" | "cap" | "indirizzo_residenza_completo",
      rawValue: string,
    ) => {
      if (!onPatchWorkerField) return;
      const nextValue = rawValue.trim();
      const currentValue = asString(workerRow[field]);
      if (nextValue === currentValue) return;
      await onPatchWorkerField(field, nextValue || null);
    },
    [onPatchWorkerField, workerRow],
  );

  const commitFamilyAddressField = React.useCallback(
    async (
      field:
        | "indirizzo_prova_provincia"
        | "indirizzo_prova_cap"
        | "indirizzo_prova_via"
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
              : asString(familyAddressNote);
      if (nextValue === currentValue) return;
      await onPatchProcessField(field, nextValue || null);
    },
    [
      familyAddress,
      familyAddressNote,
      familyCap,
      familyProvince,
      onPatchProcessField,
    ],
  );

  const commitMobilita = React.useCallback(async () => {
    if (!onPatchWorkerField) return;
    const nextValues = addressDraft.mobilita
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const currentValues = readArrayStrings(workerRow.come_ti_sposti);
    if (JSON.stringify(nextValues) === JSON.stringify(currentValues)) return;
    await onPatchWorkerField(
      "come_ti_sposti",
      nextValues.length > 0 ? nextValues : null,
    );
  }, [addressDraft.mobilita, onPatchWorkerField, workerRow.come_ti_sposti]);

  const travelTone = getTravelTimeTone(travelMinutes);
  const mobility = readArrayStrings(workerRow.come_ti_sposti);
  const availabilityPayload = parseAvailabilityPayload(
    workerRow.availability_final_json,
  );
  const availableDaysFromSlots = AVAILABILITY_VISIBLE_DAY_ORDER.filter(
    (day) => readAvailabilitySlots(availabilityPayload?.weekly, day).length > 0,
  ).length;
  const availableDays =
    availableDaysFromSlots > 0
      ? availableDaysFromSlots
      : readArrayStrings(workerRow.disponibilita_nel_giorno).length;
  const travelTimeLabel =
    roundedTravelMinutes != null
      ? `${roundedTravelMinutes} min per ${
          processWeeklyHours && processWeeklyHours.trim()
            ? processWeeklyHours.trim()
            : "-"
        } | ${availableDays > 0 ? `${availableDays}g` : "-"} a settimana`
      : "Non dichiarato";

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

      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Indirizzo lavoratore
        </p>
        {isEditing ? (
          <div className="grid gap-2">
            <Select
              value={addressDraft.provincia || "none"}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : value;
                setAddressDraft((current) => ({
                  ...current,
                  provincia: nextValue,
                }));
                void commitAddressField("provincia", nextValue);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna provincia</SelectItem>
                {provinceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={addressDraft.cap}
              onChange={(event) =>
                setAddressDraft((current) => ({
                  ...current,
                  cap: event.target.value,
                }))
              }
              onBlur={() => void commitAddressField("cap", addressDraft.cap)}
              className="h-9 text-sm"
              placeholder="CAP"
            />
            <Input
              value={addressDraft.indirizzo_residenza_completo}
              onChange={(event) =>
                setAddressDraft((current) => ({
                  ...current,
                  indirizzo_residenza_completo: event.target.value,
                }))
              }
              onBlur={() =>
                void commitAddressField(
                  "indirizzo_residenza_completo",
                  addressDraft.indirizzo_residenza_completo,
                )
              }
              className="h-9 text-sm"
              placeholder="Indirizzo"
            />
          </div>
        ) : (
          <p>
            {asString(workerRow.provincia) || "-"} •{" "}
            {asString(workerRow.cap) || "-"} •{" "}
            {asString(workerRow.indirizzo_residenza_completo) || "-"}
          </p>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Indirizzo famiglia
        </p>
        {isEditing ? (
          <div className="grid gap-2">
            <Select
              value={familyAddressDraft.provincia || "none"}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : value;
                setFamilyAddressDraft((current) => ({
                  ...current,
                  provincia: nextValue,
                }));
                void commitFamilyAddressField(
                  "indirizzo_prova_provincia",
                  nextValue,
                );
              }}
              disabled={updatingProcessAddress}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna provincia</SelectItem>
                {provinceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={familyAddressDraft.cap}
              onChange={(event) =>
                setFamilyAddressDraft((current) => ({
                  ...current,
                  cap: event.target.value,
                }))
              }
              onBlur={() =>
                void commitFamilyAddressField(
                  "indirizzo_prova_cap",
                  familyAddressDraft.cap,
                )
              }
              className="h-9 text-sm"
              placeholder="CAP"
              disabled={updatingProcessAddress}
            />
            <Input
              value={familyAddressDraft.indirizzo}
              onChange={(event) =>
                setFamilyAddressDraft((current) => ({
                  ...current,
                  indirizzo: event.target.value,
                }))
              }
              onBlur={() =>
                void commitFamilyAddressField(
                  "indirizzo_prova_via",
                  familyAddressDraft.indirizzo,
                )
              }
              className="h-9 text-sm"
              placeholder="Indirizzo"
              disabled={updatingProcessAddress}
            />
            <Input
              value={familyAddressDraft.note}
              onChange={(event) =>
                setFamilyAddressDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              onBlur={() =>
                void commitFamilyAddressField(
                  "indirizzo_prova_note",
                  familyAddressDraft.note,
                )
              }
              className="h-9 text-sm sm:col-span-3"
              placeholder="Note indirizzo"
              disabled={updatingProcessAddress}
            />
          </div>
        ) : (
          <p>
            {familyProvince && familyProvince !== "-" ? familyProvince : "-"} •{" "}
            {familyCap && familyCap !== "-" ? familyCap : "-"} •{" "}
            {familyAddress && familyAddress !== "-" ? familyAddress : "-"}
            {familyAddressNote && familyAddressNote !== "-"
              ? ` • ${familyAddressNote}`
              : ""}
          </p>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Mobilita
        </p>
        {isEditing ? (
          <Input
            value={addressDraft.mobilita}
            onChange={(event) =>
              setAddressDraft((current) => ({
                ...current,
                mobilita: event.target.value,
              }))
            }
            onBlur={() => void commitMobilita()}
            className="h-9 text-sm"
            placeholder="Es. Auto, Mezzi, Bici"
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
  draft,
  jobSearchDraft,
  onDraftChange,
  onJobSearchDraftChange,
  onJobSearchFieldPatch,
  onFieldBlur,
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
  onFieldBlur: (
    field:
      | "anni_esperienza_colf"
      | "anni_esperienza_badante"
      | "anni_esperienza_babysitter"
      | "situazione_lavorativa_attuale",
  ) => void;
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
  return (
    <ExperienceReferencesCard
      workerId={workerRow.id}
      title="Esperienza"
      isEditing={isEditing}
      showEditAction
      showCreateExperienceAction={isEditing}
      collapsible
      isUpdating={isUpdating}
      draft={draft}
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
      selectedAnniEsperienzaColf={asInputValue(workerRow.anni_esperienza_colf)}
      selectedAnniEsperienzaBadante={asInputValue(
        workerRow.anni_esperienza_badante,
      )}
      selectedAnniEsperienzaBabysitter={asInputValue(
        workerRow.anni_esperienza_babysitter,
      )}
      selectedSituazioneLavorativaAttuale={asString(
        workerRow.situazione_lavorativa_attuale,
      )}
      onToggleEdit={onToggleEdit}
      onAnniEsperienzaColfChange={(value) =>
        onDraftChange({ anni_esperienza_colf: value })
      }
      onAnniEsperienzaBadanteChange={(value) =>
        onDraftChange({ anni_esperienza_badante: value })
      }
      onAnniEsperienzaBabysitterChange={(value) =>
        onDraftChange({ anni_esperienza_babysitter: value })
      }
      onSituazioneLavorativaAttualeChange={(value) =>
        onDraftChange({ situazione_lavorativa_attuale: value })
      }
      onAnniEsperienzaColfBlur={() => onFieldBlur("anni_esperienza_colf")}
      onAnniEsperienzaBadanteBlur={() => onFieldBlur("anni_esperienza_badante")}
      onAnniEsperienzaBabysitterBlur={() =>
        onFieldBlur("anni_esperienza_babysitter")
      }
      onSituazioneLavorativaAttualeBlur={() =>
        onFieldBlur("situazione_lavorativa_attuale")
      }
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
  onVincoliBlur,
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
  onVincoliBlur: () => void;
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
      onVincoliBlur={onVincoliBlur}
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
  items,
  loading = false,
  onOpenSearch,
}: {
  items: RelatedActiveSearchItem[];
  loading?: boolean;
  onOpenSearch?: (processId: string, selectionId: string) => void;
}) {
  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, RelatedActiveSearchItem[]>();

    for (const item of items) {
      const groupKey = item.statoRicerca || "Senza stato";
      const currentItems = groups.get(groupKey) ?? [];
      currentItems.push(item);
      groups.set(groupKey, currentItems);
    }

    return Array.from(groups.entries());
  }, [items]);

  return (
    <DetailSectionBlock
      title="Altre ricerche attive"
      icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
      collapsible
      contentClassName="space-y-3"
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">Caricamento ricerche attive...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessun'altra ricerca attiva.</p>
      ) : (
        groupedItems.map(([groupLabel, groupItems]) => (
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
        ))
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
  onPatchProcessField,
  processWeeklyHours,
  familyAddress,
  familyCap,
  familyProvince,
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
  onAvailabilityVincoliBlur,
  isEditingExperience,
  onToggleExperienceEdit,
  updatingExperience,
  experienceDraft,
  onExperienceDraftChange,
  onExperienceFieldBlur,
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
  documentiVerificatiOptions,
  documentiInRegolaOptions,
  onDocumentVerificationChange,
  onDocumentStatusChange,
  onDocumentNaspiChange,
  onDocumentNaspiBlur,
  onDocumentIbanChange,
  onDocumentIbanBlur,
  onDocumentStripeAccountChange,
  onDocumentStripeAccountBlur,
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
        onPatchProcessField={onPatchProcessField}
        processWeeklyHours={processWeeklyHours}
        familyAddress={familyAddress}
        familyCap={familyCap}
        familyProvince={familyProvince}
        familyAddressNote={familyAddressNote}
        provinceOptions={provinceOptions}
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
        onFieldBlur={onExperienceFieldBlur}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onExperienceDelete={onExperienceDelete}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
      <RelatedActiveSearchesBlock
        items={relatedActiveSearches}
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
        onVincoliBlur={onAvailabilityVincoliBlur}
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
          iban: asString(workerRow.iban),
          id_stripe_account: asString(workerRow.id_stripe_account),
        }}
        onToggleEdit={onToggleDocumentsEdit}
        onVerificationChange={onDocumentVerificationChange}
        onStatoDocumentiChange={onDocumentStatusChange}
        onNaspiChange={onDocumentNaspiChange}
        onNaspiBlur={onDocumentNaspiBlur}
        onIbanChange={onDocumentIbanChange}
        onIbanBlur={onDocumentIbanBlur}
        onStripeAccountChange={onDocumentStripeAccountChange}
        onStripeAccountBlur={onDocumentStripeAccountBlur}
        onDocumentUpsert={onDocumentUpsert}
        onUploadError={onDocumentUploadError}
        collapsible
        defaultOpen={false}
      />
    </React.Fragment>
  );
}
