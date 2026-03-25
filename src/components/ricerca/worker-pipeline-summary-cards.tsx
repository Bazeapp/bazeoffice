import * as React from "react";
import { Clock3Icon, PencilIcon } from "lucide-react";

import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import { DetailSectionCard } from "@/components/shared/detail-section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { LookupOption } from "@/features/lavoratori/lib/lookup-utils";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";

type WorkerPipelineSummaryCardsProps = {
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
  referenceStatusOptions: LookupOption[];
  experiences: EsperienzaLavoratoreRecord[];
  experiencesLoading?: boolean;
  references: ReferenzaLavoratoreRecord[];
  referencesLoading?: boolean;
  isEditingAvailability: boolean;
  onToggleAvailabilityEdit: () => void;
  updatingAvailability: boolean;
  availabilityMatrix: Record<string, boolean>;
  availabilityVincoli: string;
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
  const travelMinutes = toNumber(selectionRow?.travel_time_tra_cap);
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
    travelMinutes != null
      ? `${travelMinutes} min per ${
          processWeeklyHours && processWeeklyHours.trim()
            ? processWeeklyHours.trim()
            : "-"
        } | ${availableDays > 0 ? `${availableDays}g` : "-"} a settimana`
      : "Non dichiarato";

  return (
    <DetailSectionCard
      title="Travel time"
      titleIcon={<Clock3Icon className="text-muted-foreground size-4" />}
      titleAction={
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
      titleOnBorder
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 text-sm sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Tempo di viaggio dichiarato
        </p>
        {travelMinutes != null ? (
          <p className="text-foreground font-medium">{travelTimeLabel}</p>
        ) : (
          <p className="text-muted-foreground">Non dichiarato</p>
        )}
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Indirizzo lavoratore
        </p>
        {isEditing ? (
          <div className="grid gap-2 sm:grid-cols-[140px_120px_minmax(0,1fr)]">
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
              <SelectTrigger className="h-9 text-sm">
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

      <div className="grid gap-4 text-sm sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          Indirizzo famiglia
        </p>
        {isEditing ? (
          <div className="grid gap-2 sm:grid-cols-[140px_120px_minmax(0,1fr)]">
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
              <SelectTrigger className="h-9 text-sm">
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

      <div className="grid gap-4 text-sm sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
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
    </DetailSectionCard>
  );
}

function ExperienceBlock({
  workerRow,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  references,
  referencesLoading = false,
  isEditing,
  onToggleEdit,
  isUpdating,
  draft,
  onDraftChange,
  onFieldBlur,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerRow: LavoratoreRecord;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  referenceStatusOptions: LookupOption[];
  experiences: EsperienzaLavoratoreRecord[];
  experiencesLoading?: boolean;
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
  onDraftChange: (
    patch: Partial<{
      anni_esperienza_colf: string;
      anni_esperienza_badante: string;
      anni_esperienza_babysitter: string;
      situazione_lavorativa_attuale: string;
    }>,
  ) => void;
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
      showCreateExperienceAction={false}
      isUpdating={isUpdating}
      draft={draft}
      experiences={experiences}
      experiencesLoading={experiencesLoading}
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
      onReferencePatch={onReferencePatch}
      onReferenceCreate={onReferenceCreate}
    />
  );
}

function AvailabilityCard({
  availabilityTitleMeta,
  familyAvailabilityJson,
  familyWorkSchedule,
  familyWeeklyFrequency,
  processWeeklyHours,
  isEditing,
  onToggleEdit,
  isUpdating,
  matrix,
  readOnlyRows,
  vincoliOrari,
  onMatrixChange,
  onVincoliChange,
  onVincoliBlur,
}: {
  availabilityTitleMeta: string;
  familyAvailabilityJson?: string | null;
  familyWorkSchedule?: string | null;
  familyWeeklyFrequency?: string | null;
  processWeeklyHours?: string | null;
  isEditing: boolean;
  onToggleEdit: () => void;
  isUpdating: boolean;
  matrix: Record<string, boolean>;
  readOnlyRows: Array<{ day: string; activeByHour: boolean[] }>;
  vincoliOrari: string;
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
      onMatrixChange={onMatrixChange}
      onVincoliChange={onVincoliChange}
      onVincoliBlur={onVincoliBlur}
    />
  );
}

export function WorkerPipelineSummaryCards({
  workerRow,
  selectionRow,
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
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  references,
  referencesLoading = false,
  isEditingAvailability,
  onToggleAvailabilityEdit,
  updatingAvailability,
  availabilityMatrix,
  availabilityVincoli,
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
  onReferencePatch,
  onReferenceCreate,
  isEditingSkills,
  onToggleSkillsEdit,
  updatingSkills,
  skillsDraft,
  onSkillsDraftChange,
  onSkillsFieldPatch,
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
        referenceStatusOptions={referenceStatusOptions}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        references={references}
        referencesLoading={referencesLoading}
        isEditing={isEditingExperience}
        onToggleEdit={onToggleExperienceEdit}
        isUpdating={updatingExperience}
        draft={experienceDraft}
        onDraftChange={onExperienceDraftChange}
        onFieldBlur={onExperienceFieldBlur}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
      <AvailabilityCard
        availabilityTitleMeta={availabilityTitleMeta}
        familyAvailabilityJson={familyAvailabilityJson}
        familyWorkSchedule={familyWorkSchedule}
        familyWeeklyFrequency={familyWeeklyFrequency}
        processWeeklyHours={processWeeklyHours}
        isEditing={isEditingAvailability}
        onToggleEdit={onToggleAvailabilityEdit}
        isUpdating={updatingAvailability}
        matrix={availabilityMatrix}
        readOnlyRows={availabilityReadOnlyRows}
        vincoliOrari={availabilityVincoli}
        onMatrixChange={onAvailabilityMatrixChange}
        onVincoliChange={onAvailabilityVincoliChange}
        onVincoliBlur={onAvailabilityVincoliBlur}
      />
      <SkillsCompetenzeCard
        isEditing={isEditingSkills}
        isUpdating={updatingSkills}
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
    </React.Fragment>
  );
}
