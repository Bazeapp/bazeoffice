import * as React from "react";
import type { ReactNode } from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CatIcon,
  CopyIcon,
  ExternalLinkIcon,
  HomeIcon,
  MapPinnedIcon,
  SaveIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  OnboardingDecisioneLavoroSection,
  type OnboardingDecisioneLavoroSectionKey,
  type OnboardingDecisioneLavoroCheckboxDefaults,
} from "./onboarding-decisione-lavoro-card";
import { CrmDetailCard } from "../detail-card";
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card";
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
import { DatePicker } from "@/components/ui/date-picker";
import { useController } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "../../../hooks/use-crm-pipeline-preview";
import { invokeEdgeFunction } from "@/lib/supabase-edge";
import { cn } from "@/lib/utils";
import { updateRecord } from "@/lib/anagrafiche-api";
import { useProvincie } from "@/hooks/use-provincie";

type OnboardingCardProps = {
  card: CrmPipelineCardData | null;
  lookupOptionsByField?: LookupOptionsByField;
  titleAction?: ReactNode;
  sectionTitleAction?: ReactNode;
  showTitle?: boolean;
  sectionsCollapsible?: boolean;
  firstSectionDefaultOpen?: boolean;
  sectionsDefaultOpen?: boolean;
  showOrariFrequenza?: boolean;
  showLuogoLavoro?: boolean;
  showFamiglia?: boolean;
  showCasa?: boolean;
  showAnimali?: boolean;
  showMansioni?: boolean;
  showRichiesteSpecifiche?: boolean;
  showTempistiche?: boolean;
  readOnly?: boolean;
  flattenSections?: boolean;
  requiredMissingFields?: string[];
  privateAreaUrl?: string;
  sectionContainerProps?: Partial<
    Record<OnboardingFlatSectionKey, React.ComponentProps<"div">>
  >;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
  onPatchAddress?: (
    processId: string,
    addressId: string | null,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
};

export type OnboardingFlatSectionKey =
  | "orari-frequenza"
  | "luogo-lavoro"
  | OnboardingDecisioneLavoroSectionKey
  | "tempistiche";

type LookupOption = LookupOptionsByField[string][number];

const SCONTO_APPLICATO_OPTIONS: LookupOption[] = [
  { valueKey: "50%", valueLabel: "50%", color: null, sortOrder: 1 },
  { valueKey: "prova_gratuita", valueLabel: "prova_gratuita", color: null, sortOrder: 2 },
  { valueKey: "100€", valueLabel: "100€", color: null, sortOrder: 3 },
];

function toInputValue(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized || normalized === "-") return "";
  return normalized;
}

function clampNumericInput(value: string, max: number) {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  const parsed = Number.parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, max));
}

function toIsoDate(value: string) {
  const normalized = value.trim();
  const parts = normalized.split("/");
  if (parts.length !== 3) return normalized || null;
  const day = parts[0]?.padStart(2, "0");
  const month = parts[1]?.padStart(2, "0");
  const year = parts[2];
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

const WEEKDAY_ITEMS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

const WEEKDAY_ALIASES: Record<string, (typeof WEEKDAY_ITEMS)[number]> = {
  lunedi: "Lunedì",
  "lunedì": "Lunedì",
  martedi: "Martedì",
  "martedì": "Martedì",
  mercoledi: "Mercoledì",
  "mercoledì": "Mercoledì",
  giovedi: "Giovedì",
  "giovedì": "Giovedì",
  venerdi: "Venerdì",
  "venerdì": "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

function normalizeWeekday(value: string): (typeof WEEKDAY_ITEMS)[number] | null {
  const token = value.trim().toLowerCase();
  return WEEKDAY_ALIASES[token] ?? null;
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function getSelectedLookupValue(
  rawValue: string | null | undefined,
  options: LookupOption[],
) {
  const token = normalizeLookupToken(rawValue);
  if (!token || token === "-") return "";
  const match = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token,
  );
  return match?.valueKey ?? rawValue ?? "";
}

function getLookupLabelForSave(
  rawValue: string | null | undefined,
  options: LookupOption[],
) {
  const token = normalizeLookupToken(rawValue);
  if (!token || token === "-") return "";
  const match = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token,
  );
  return match?.valueLabel ?? rawValue ?? "";
}

function getTagClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700";
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700";
    case "green":
      return "border-green-200 bg-green-100 text-green-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700";
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700";
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700";
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700";
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700";
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700";
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700";
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function normalizeWeekdayList(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return Array.from(
    new Set(
      values.map((value) => normalizeWeekday(value)).filter(Boolean),
    ),
  ) as string[];
}

function displayText(value: string | null | undefined) {
  const normalized = toInputValue(value);
  return normalized || "-";
}

const REQUIRED_FIELD_CLASS =
  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30";

type CopyableUrlFieldProps = {
  label: string;
  value: string;
  copyLabel: string;
  copyButtonLabel: string;
  openButtonLabel: string;
  onCopy: (value: string, label: string) => void;
};

function CopyableUrlField({
  label,
  value,
  copyLabel,
  copyButtonLabel,
  openButtonLabel,
  onCopy,
}: CopyableUrlFieldProps) {
  const hasValue = value.trim().length > 0;

  return (
    <Field>
      <div className="flex flex-col items-start gap-2">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasValue}
            onClick={() => onCopy(value, copyLabel)}
            aria-label={copyButtonLabel}
          >
            <CopyIcon className="size-4" />
            {copyButtonLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasValue}
            onClick={() => {
              window.open(value, "_blank", "noopener,noreferrer");
            }}
            aria-label={openButtonLabel}
          >
            <ExternalLinkIcon className="size-4" />
            {openButtonLabel}
          </Button>
        </div>
      </div>
    </Field>
  );
}

// FASE 5 BIS — wrapper form-aware (Select lookup con label↔key, provincia,
// picker giorni, datepicker). FieldInput dal toolkit copre i campi testo/numero.
function FieldOnboardingLookupSelect({
  name,
  options,
  placeholder,
  triggerId,
  triggerClassName,
}: {
  name: string;
  options: LookupOption[];
  placeholder: string;
  triggerId?: string;
  triggerClassName?: string;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={getSelectedLookupValue(current, options) || undefined}
      onValueChange={(key) => field.onChange(getLookupLabelForSave(key, options))}
    >
      <SelectTrigger id={triggerId} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.valueKey} value={option.valueKey}>
              {option.valueLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function FieldProvinciaSelect({
  name,
  options,
  invalid,
}: {
  name: string;
  options: LookupOption[];
  invalid?: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={getSelectedLookupValue(current, options)}
      onValueChange={(next) => field.onChange(next)}
    >
      <SelectTrigger
        id="onboarding-provincia"
        className={cn("w-full", invalid && REQUIRED_FIELD_CLASS)}
      >
        <SelectValue placeholder="Seleziona provincia" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.valueKey} value={option.valueKey}>
              {option.valueLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function FieldWeekdayPicker({ name, invalid }: { name: string; invalid?: boolean }) {
  const { field } = useController({ name });
  const anchor = useComboboxAnchor();
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <Combobox
      multiple
      autoHighlight
      items={WEEKDAY_ITEMS}
      value={value}
      onValueChange={(next) => field.onChange(normalizeWeekdayList(next as string[]))}
    >
      <ComboboxChips
        ref={anchor}
        id="onboarding-giornate-preferite"
        className={cn("w-full", invalid && REQUIRED_FIELD_CLASS)}
      >
        <ComboboxValue>
          {(values) => (
            <>
              {values.map((entry: string) => (
                <ComboboxChip key={entry}>{entry}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Nessun giorno trovato.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function FieldDeadline({ name }: { name: string }) {
  const { field } = useController({ name });
  return (
    <DatePicker
      value={typeof field.value === "string" ? field.value : ""}
      onValueChange={field.onChange}
      placeholder="dd/mm/yyyy"
    />
  );
}

const ONBOARDING_ADDRESS_KEYS = new Set([
  "provincia_sigla",
  "cap",
  "via",
  "note",
]);
const ONBOARDING_AVAILABILITY_KEYS = new Set([
  "orario_di_lavoro",
  "ore_settimanale",
  "numero_giorni_settimanali",
  "preferenza_giorno",
]);

// FASE 5 BIS — defaults del form (chiavi = colonne DB; fee_concordata gestita a
// parte verso richieste_attivazione). Ricostruiti ad ogni render dal card.
function buildOnboardingDefaults(card: CrmPipelineCardData | null) {
  return {
    orario_di_lavoro: toInputValue(card?.orarioDiLavoro),
    ore_settimanale: toInputValue(card?.oreSettimana),
    numero_giorni_settimanali: toInputValue(card?.giorniSettimana),
    preferenza_giorno: normalizeWeekdayList(card?.giornatePreferite),
    provincia_sigla: toInputValue(
      card?.indirizzoProvinciaSigla || card?.indirizzoProvincia,
    ),
    cap: toInputValue(card?.indirizzoCap),
    via: toInputValue(card?.indirizzoVia),
    note: toInputValue(card?.indirizzoNote),
    src_embed_maps_annucio: toInputValue(card?.srcEmbedMapsAnnucio),
    deadline_mobile: toInputValue(card?.deadlineMobile),
    disponibilita_colloqui_in_presenza: toInputValue(
      card?.disponibilitaColloquiInPresenza,
    ),
    tipo_incontro_famiglia_lavoratore: toInputValue(
      card?.tipoIncontroFamigliaLavoratore,
    ),
    fee_concordata: card?.feeConcordata != null ? String(card.feeConcordata) : "",
    offerta: toInputValue(card?.scontoApplicatoRaw ?? card?.scontoApplicato),
  };
}

export function OnboardingCard({
  card,
  lookupOptionsByField,
  titleAction,
  sectionTitleAction,
  showTitle = true,
  sectionsCollapsible,
  firstSectionDefaultOpen = true,
  sectionsDefaultOpen = false,
  showOrariFrequenza = true,
  showLuogoLavoro = true,
  showFamiglia = true,
  showCasa = true,
  showAnimali = true,
  showMansioni = true,
  showRichiesteSpecifiche = true,
  showTempistiche = true,
  readOnly = false,
  flattenSections = false,
  requiredMissingFields = [],
  privateAreaUrl = "",
  sectionContainerProps,
  onPatchProcess,
  onPatchAddress,
}: OnboardingCardProps) {
  const resolvedSectionAction = sectionTitleAction ?? titleAction;
  const shouldCollapseSections = sectionsCollapsible ?? flattenSections;
  const [isSavingAvailability, setIsSavingAvailability] = React.useState(false);

  const weekdayColorMap = React.useMemo(() => {
    const options = (lookupOptionsByField?.preferenza_giorno ??
      []) as LookupOption[];
    const map = new Map<string, string>();
    for (const option of options) {
      if (!option.color) continue;
      map.set(normalizeLookupToken(option.valueKey), option.color);
      map.set(normalizeLookupToken(option.valueLabel), option.color);
    }
    return map;
  }, [lookupOptionsByField]);

  const getWeekdayColor = React.useCallback(
    (weekday: string) => {
      const normalizedWeekday = normalizeLookupToken(weekday);
      return weekdayColorMap.get(normalizedWeekday) ?? null;
    },
    [weekdayColorMap],
  );

  const cardId = card?.id;
  const addressId = card?.indirizzoId ?? null;
  const richiestaAttivazioneId = card?.richiestaAttivazioneId;

  const patchProcess = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!cardId) return;
      await onPatchProcess?.(cardId, patch);
    },
    [cardId, onPatchProcess],
  );

  // Throttle the family-availability edge function: per-field saves happen
  // immediately (via DebouncedInput onSave), but the expensive recompute is
  // scheduled 10s after the last availability-related edit and coalesced
  // across multiple edits. The user can also trigger it immediately with
  // the explicit button.
  const FAMILY_AVAILABILITY_THROTTLE_MS = 10000;
  const familyAvailabilityTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const invokeFamilyAvailability = React.useCallback(
    async (showToast: boolean) => {
      if (!cardId) return;
      try {
        await invokeEdgeFunction("family-availability", {
          processo_matching_id: cardId,
        });
        if (showToast) toast.success("Disponibilita famiglia ricalcolata");
      } catch (error) {
        if (showToast) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Errore ricalcolando disponibilita famiglia",
          );
        }
      }
    },
    [cardId],
  );

  const scheduleFamilyAvailabilityRefresh = React.useCallback(() => {
    if (!cardId) return;
    if (familyAvailabilityTimerRef.current) {
      clearTimeout(familyAvailabilityTimerRef.current);
    }
    familyAvailabilityTimerRef.current = setTimeout(() => {
      familyAvailabilityTimerRef.current = null;
      void invokeFamilyAvailability(false);
    }, FAMILY_AVAILABILITY_THROTTLE_MS);
  }, [cardId, invokeFamilyAvailability]);

  // Flush the scheduled recompute when the card switches or unmounts so the
  // backend never misses a final invocation.
  React.useEffect(() => {
    return () => {
      if (familyAvailabilityTimerRef.current) {
        clearTimeout(familyAvailabilityTimerRef.current);
        familyAvailabilityTimerRef.current = null;
        void invokeFamilyAvailability(false);
      }
    };
  }, [cardId, invokeFamilyAvailability]);

  const triggerFamilyAvailabilityNow = React.useCallback(async () => {
    if (familyAvailabilityTimerRef.current) {
      clearTimeout(familyAvailabilityTimerRef.current);
      familyAvailabilityTimerRef.current = null;
    }
    if (!cardId || isSavingAvailability) return;
    setIsSavingAvailability(true);
    try {
      await invokeFamilyAvailability(true);
    } finally {
      setIsSavingAvailability(false);
    }
  }, [cardId, invokeFamilyAvailability, isSavingAvailability]);

  const availabilitySaveAction = !readOnly ? (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void triggerFamilyAvailabilityNow()}
        disabled={!cardId || isSavingAvailability}
        title="Ricalcola subito la disponibilita (altrimenti avviene automaticamente 10 secondi dopo l'ultima modifica)"
      >
        <SaveIcon />
        {isSavingAvailability ? "Ricalcolo..." : "Ricalcola"}
      </Button>
      {resolvedSectionAction}
    </div>
  ) : (
    resolvedSectionAction
  );

  const patchAddress = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!cardId) return;
      await onPatchAddress?.(cardId, addressId, patch);
    },
    [addressId, cardId, onPatchAddress],
  );

  // FASE 5 BIS — form + autosave: source of truth unica per i campi editabili.
  // Sostituisce i 6 useDebouncedSave, i 3 useState locali + 2 useEffect di
  // resync. onSave instrada per chiave ai 3 target: indirizzo, processo, e
  // richieste_attivazione (fee). I campi disponibilità innescano il ricalcolo
  // family-availability (throttled). Resync realtime senza clobber: keepDirtyValues.
  const form = useAutoSaveForm({
    defaults: buildOnboardingDefaults(card),
    onSave: async (patch) => {
      const processPatch: Record<string, unknown> = {};
      const addressPatch: Record<string, unknown> = {};
      let touchedAvailability = false;
      for (const [key, value] of Object.entries(patch)) {
        if (key === "fee_concordata") {
          if (!richiestaAttivazioneId) continue;
          const normalized = String(value ?? "").trim().replace(",", ".");
          const nextValue = normalized ? Number(normalized) : null;
          if (normalized && Number.isNaN(nextValue)) {
            toast.error("Fee concordata non valida");
            continue;
          }
          await updateRecord("richieste_attivazione", richiestaAttivazioneId, {
            fee_concordata: nextValue,
          });
          continue;
        }
        if (ONBOARDING_AVAILABILITY_KEYS.has(key)) touchedAvailability = true;
        if (ONBOARDING_ADDRESS_KEYS.has(key)) {
          addressPatch[key] = (value as string) || null;
        } else if (key === "ore_settimanale") {
          processPatch.ore_settimanale = clampNumericInput(value as string, 52) || null;
        } else if (key === "numero_giorni_settimanali") {
          processPatch.numero_giorni_settimanali =
            clampNumericInput(value as string, 7) || null;
        } else if (key === "preferenza_giorno") {
          processPatch.preferenza_giorno = value;
        } else if (key === "deadline_mobile") {
          processPatch.deadline_mobile = value ? toIsoDate(value as string) : null;
        } else {
          processPatch[key] = (value as string) || null;
        }
      }
      if (Object.keys(addressPatch).length > 0) await patchAddress(addressPatch);
      if (Object.keys(processPatch).length > 0) await patchProcess(processPatch);
      if (touchedAvailability) scheduleFamilyAvailabilityRefresh();
    },
  });

  const copyToClipboard = React.useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiato`);
    } catch {
      toast.error(`Impossibile copiare ${label.toLowerCase()}`);
    }
  }, []);

  const checkboxDefaults = React.useMemo<OnboardingDecisioneLavoroCheckboxDefaults>(
    () => {
      const sesso = String(card?.sesso ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

      return {
        "onboarding-patente-si": card?.richiestaPatente ?? false,
        "onboarding-trasferte-si": card?.richiestaTrasferte ?? false,
        "onboarding-ferie-si": card?.richiestaFerie ?? false,
        "onboarding-genere-donna": sesso === "donna",
        "onboarding-genere-uomo": sesso === "uomo",
      };
    },
    [card?.richiestaFerie, card?.richiestaPatente, card?.richiestaTrasferte, card?.sesso],
  );

  const tipoIncontroOptions = React.useMemo(() => {
    const fromLookup =
      lookupOptionsByField?.tipo_incontro_famiglia_lavoratore ?? [];
    if (fromLookup.length > 0) return fromLookup;
    return [
      {
        valueKey: "prova_diretta",
        valueLabel: "Prova diretta",
        color: null,
        sortOrder: 1,
      },
      {
        valueKey: "colloquio_conoscitivo",
        valueLabel: "Colloquio conoscitivo",
        color: null,
        sortOrder: 2,
      },
    ] as LookupOption[];
  }, [lookupOptionsByField]);
  const { data: provincieData } = useProvincie();
  const orderedProvinciaOptions = React.useMemo<LookupOption[]>(() => {
    return (provincieData ?? []).map((row, index) => ({
      valueKey: row.sigla,
      valueLabel: row.sigla,
      color: null,
      sortOrder: index,
    }));
  }, [provincieData]);
  const isRequiredMissing = React.useCallback(
    (field: string) => requiredMissingFields.includes(field),
    [requiredMissingFields],
  );
  const scontoApplicatoOptions = React.useMemo(() => {
    const fromLookup = lookupOptionsByField?.offerta ?? [];
    return fromLookup.length > 0 ? fromLookup : SCONTO_APPLICATO_OPTIONS;
  }, [lookupOptionsByField]);
  const preventivoAcceptanceUrl = card?.preventivoAcceptanceUrl ?? "";

  const lookupLabel = React.useCallback(
    (field: string, rawValue: string | null | undefined) => {
      const token = normalizeLookupToken(rawValue);
      if (!token || token === "-") return "-";
      const options = lookupOptionsByField?.[field] ?? [];
      const match = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token,
      );
      return match?.valueLabel ?? displayText(rawValue);
    },
    [lookupOptionsByField],
  );

  if (readOnly) {
    const weekdayBadges = normalizeWeekdayList(card?.giornatePreferite);
    const srcMapsValue = displayText(card?.srcEmbedMapsAnnucio);
    const hasMapsUrl = srcMapsValue !== "-";
    const tipoIncontroLabel = lookupLabel(
      "tipo_incontro_famiglia_lavoratore",
      card?.tipoIncontroFamigliaLavoratore,
    );
    const richiestaPatente = card?.richiestaPatente ? "Si" : "No";
    const richiestaTrasferte = card?.richiestaTrasferte ? "Si" : "No";
    const richiestaFerie = card?.richiestaFerie ? "Si" : "No";
    const compactGridClassName = "grid gap-4 sm:grid-cols-2";

    return (
      <div className="space-y-4">
        {showOrariFrequenza ? (
        <div {...sectionContainerProps?.["orari-frequenza"]}>
          <DetailSectionBlock
            title="Orari e frequenza"
            icon={<CalendarDaysIcon className="size-4" />}
            action={showTitle ? resolvedSectionAction : undefined}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={firstSectionDefaultOpen}
            contentClassName="space-y-4"
          >
          <DetailField
            label="Orario di lavoro"
            value={displayText(card?.orarioDiLavoro)}
            multiline
          />
          <div className={compactGridClassName}>
            <DetailField label="Ore settimanali" value={displayText(card?.oreSettimana)} />
            <DetailField label="Giorni settimanali" value={displayText(card?.giorniSettimana)} />
          </div>
          <DetailFieldControl label="Giornate preferite">
            {weekdayBadges.length ? (
              <div className="flex flex-wrap gap-1.5">
                {weekdayBadges.map((day) => (
                  <Badge
                    key={day}
                    variant="outline"
                    className={cn(
                      "h-5 px-2 text-2xs font-medium",
                      getTagClassName(getWeekdayColor(day)),
                    )}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="ui-type-value">-</div>
            )}
          </DetailFieldControl>
          </DetailSectionBlock>
        </div>
        ) : null}

        {showLuogoLavoro ? (
        <div {...sectionContainerProps?.["luogo-lavoro"]}>
          <DetailSectionBlock
            title="Luogo di lavoro"
            icon={<MapPinnedIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Provincia" value={displayText(card?.indirizzoProvincia)} />
            <DetailField label="CAP" value={displayText(card?.indirizzoCap)} />
          </div>
          <div className={compactGridClassName}>
            <DetailField label="Via" value={displayText(card?.indirizzoVia)} />
            <DetailField label="Quartiere" value={displayText(card?.indirizzoNote)} />
          </div>
          <DetailFieldControl label="SRC Maps">
            {hasMapsUrl ? (
              <a
                href={srcMapsValue}
                target="_blank"
                rel="noreferrer"
                className="ui-type-value text-primary break-all underline underline-offset-2"
              >
                {srcMapsValue}
              </a>
            ) : (
              <div className="ui-type-value">-</div>
            )}
          </DetailFieldControl>
          </DetailSectionBlock>
        </div>
        ) : null}

        {showFamiglia ? (
        <div {...sectionContainerProps?.famiglia}>
          <DetailSectionBlock
            title="Famiglia"
            icon={<UsersIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Nucleo famigliare" value={displayText(card?.nucleoFamigliare)} />
            <DetailField label="Eta lavoratore" value={`${displayText(card?.etaMinima)} - ${displayText(card?.etaMassima)}`} />
          </div>
          </DetailSectionBlock>
        </div>
        ) : null}

        {showCasa ? (
        <div {...sectionContainerProps?.casa}>
          <DetailSectionBlock
            title="Casa"
            icon={<HomeIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
            <DetailField label="Descrizione casa" value={displayText(card?.descrizioneCasa)} />
            <div className={compactGridClassName}>
              <DetailField label="Metratura casa" value={displayText(card?.metraturaCasa)} />
              <DetailField label="Sesso" value={displayText(card?.sesso)} />
            </div>
          </DetailSectionBlock>
        </div>
        ) : null}

        {showAnimali ? (
        <div {...sectionContainerProps?.animali}>
          <DetailSectionBlock
            title="Animali"
            icon={<CatIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
            <DetailField label="Animali in casa" value={displayText(card?.descrizioneAnimaliInCasa)} />
          </DetailSectionBlock>
        </div>
        ) : null}

        {showMansioni ? (
        <div {...sectionContainerProps?.mansioni}>
          <DetailSectionBlock
            title="Mansioni"
            icon={<BriefcaseIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
            <DetailField label="Mansioni richieste" value={displayText(card?.mansioniRichieste)} />
          </DetailSectionBlock>
        </div>
        ) : null}

        {showRichiesteSpecifiche ? (
        <div {...sectionContainerProps?.["richieste-specifiche"]}>
          <DetailSectionBlock
            title="Richieste specifiche"
            icon={<ShieldCheckIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Richiesta patente" value={richiestaPatente} />
            <DetailField label="Richiesta trasferte" value={richiestaTrasferte} />
          </div>
          <div className={compactGridClassName}>
            <DetailField label="Richiesta ferie" value={richiestaFerie} />
            <DetailField label="Dettaglio patente" value={displayText(card?.patenteDettaglio)} />
          </div>
          <DetailField label="Descrizione trasferte" value={displayText(card?.descrizioneRichiestaTrasferte)} />
          <DetailField label="Descrizione ferie" value={displayText(card?.descrizioneRichiestaFerie)} />
          <DetailField label="Informazioni extra riservate" value={displayText(card?.informazioniExtraRiservate)} />
          </DetailSectionBlock>
        </div>
        ) : null}

        {showTempistiche ? (
          <div {...sectionContainerProps?.tempistiche}>
            <DetailSectionBlock
              title="Tempistiche"
              icon={<TimerResetIcon className="size-4" />}
              action={resolvedSectionAction}
              showDefaultAction={false}
              collapsible={shouldCollapseSections}
              defaultOpen={sectionsDefaultOpen}
              contentClassName="space-y-4"
            >
              <DetailField label="Deadline" value={displayText(card?.deadlineMobile)} />
              <DetailField label="Disponibilita colloqui" value={displayText(card?.disponibilitaColloquiInPresenza)} />
              <DetailField label="Tipologia primo incontro" value={tipoIncontroLabel} />
              <div className={compactGridClassName}>
                <DetailField
                  label="Fee concordata"
                  value={card?.feeConcordata != null ? String(card.feeConcordata) : "-"}
                />
                <DetailField label="Sconto applicato" value={lookupLabel("offerta", card?.scontoApplicatoRaw ?? card?.scontoApplicato)} />
              </div>
              <CopyableUrlField
                label="Link preventivo"
                value={preventivoAcceptanceUrl}
                copyLabel="Link preventivo"
                copyButtonLabel="Copia link"
                openButtonLabel="Vai al link"
                onCopy={copyToClipboard}
              />
              <CopyableUrlField
                label="Link area privata"
                value={privateAreaUrl}
                copyLabel="Link area privata"
                copyButtonLabel="Copia link"
                openButtonLabel="Vai al link"
                onCopy={copyToClipboard}
              />
              <DetailField label="URL origine" value={displayText(card?.origineUrl)} />
            </DetailSectionBlock>
          </div>
        ) : null}
      </div>
    );
  }

  const flattenedContent = (
    <div className="space-y-4">
      {showOrariFrequenza ? (
      <div {...sectionContainerProps?.["orari-frequenza"]}>
        <DetailSectionBlock
          title="Orari e frequenza"
          icon={<CalendarDaysIcon className="size-4" />}
          action={availabilitySaveAction}
          showDefaultAction={false}
          collapsible={shouldCollapseSections}
          defaultOpen={firstSectionDefaultOpen}
          contentClassName="space-y-4"
        >
        <Field invalid={isRequiredMissing("orarioDiLavoro")}>
          <FieldLabel htmlFor="onboarding-orario-lavoro" className="font-semibold">
            Orario di lavoro
          </FieldLabel>
          <FieldDescription>
            Cerca di essere il più chiaro possibile e mantieni il formato del
            placeholder; in caso di più giornate specifica indicando
            &quot;OPPURE&quot;.
          </FieldDescription>
          <FieldInput
            name="orario_di_lavoro"
            id="onboarding-orario-lavoro"
            className={cn(isRequiredMissing("orarioDiLavoro") && REQUIRED_FIELD_CLASS)}
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field invalid={isRequiredMissing("oreSettimana")}>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <FieldInput
              name="ore_settimanale"
              id="onboarding-ore-settimanali"
              className={cn(isRequiredMissing("oreSettimana") && REQUIRED_FIELD_CLASS)}
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              placeholder="8"
            />
          </Field>

          <Field invalid={isRequiredMissing("giorniSettimana")}>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <FieldInput
              name="numero_giorni_settimanali"
              id="onboarding-giorni-settimanali"
              className={cn(isRequiredMissing("giorniSettimana") && REQUIRED_FIELD_CLASS)}
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              placeholder="8"
            />
          </Field>

          <Field invalid={isRequiredMissing("giornatePreferite")}>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <FieldWeekdayPicker
              name="preferenza_giorno"
              invalid={isRequiredMissing("giornatePreferite")}
            />
              </Field>
            </div>
        </DetailSectionBlock>
      </div>
      ) : null}

      {showLuogoLavoro ? (
      <div {...sectionContainerProps?.["luogo-lavoro"]}>
        <DetailSectionBlock
          title="Luogo di lavoro"
          icon={<MapPinnedIcon className="size-4" />}
          action={resolvedSectionAction}
          showDefaultAction={false}
          collapsible={shouldCollapseSections}
          defaultOpen={sectionsDefaultOpen}
          contentClassName="space-y-4"
        >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field invalid={isRequiredMissing("indirizzoProvincia")}>
            <FieldLabel htmlFor="onboarding-provincia">Provincia</FieldLabel>
            <FieldProvinciaSelect
              name="provincia_sigla"
              options={orderedProvinciaOptions}
              invalid={isRequiredMissing("indirizzoProvincia")}
            />
          </Field>
          <Field invalid={isRequiredMissing("indirizzoCap")}>
            <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
            <FieldInput
              name="cap"
              id="onboarding-cap"
              className={cn(isRequiredMissing("indirizzoCap") && REQUIRED_FIELD_CLASS)}
              placeholder="20158"
            />
          </Field>
        </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field invalid={isRequiredMissing("indirizzoVia")}>
              <FieldLabel htmlFor="onboarding-via">Via</FieldLabel>
              <FieldInput
                name="via"
                id="onboarding-via"
                className={cn(isRequiredMissing("indirizzoVia") && REQUIRED_FIELD_CLASS)}
              />
            </Field>
            <Field invalid={isRequiredMissing("indirizzoNote")}>
              <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
              <FieldInput
                name="note"
                id="onboarding-quartiere"
                className={cn(isRequiredMissing("indirizzoNote") && REQUIRED_FIELD_CLASS)}
              />
            </Field>
          </div>
        <Field invalid={isRequiredMissing("srcEmbedMapsAnnucio")}>
          <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
          <FieldInput
            name="src_embed_maps_annucio"
            id="onboarding-src-maps-edit"
            className={cn(isRequiredMissing("srcEmbedMapsAnnucio") && REQUIRED_FIELD_CLASS)}
          />
        </Field>
        </DetailSectionBlock>
      </div>
      ) : null}

      <OnboardingDecisioneLavoroSection
        checkboxDefaults={checkboxDefaults}
        lookupOptionsByField={lookupOptionsByField}
        defaults={{
          nucleoFamigliare: card?.nucleoFamigliare,
          descrizioneCasa: card?.descrizioneCasa,
          metraturaCasa: card?.metraturaCasa,
          descrizioneAnimaliInCasa: card?.descrizioneAnimaliInCasa,
          mansioniRichieste: card?.mansioniRichieste,
          informazioniExtraRiservate: card?.informazioniExtraRiservate,
          etaMinima: card?.etaMinima,
          etaMassima: card?.etaMassima,
          descrizioneRichiestaTrasferte: card?.descrizioneRichiestaTrasferte,
          descrizioneRichiestaFerie: card?.descrizioneRichiestaFerie,
          patenteDettaglio: card?.patenteDettaglio,
          sesso: card?.sesso,
          richiestaPatente: card?.richiestaPatente,
          richiestaTrasferte: card?.richiestaTrasferte,
          richiestaFerie: card?.richiestaFerie,
          nazionalitaEscluse: card?.nazionalitaEscluse,
          nazionalitaObbligatorie: card?.nazionalitaObbligatorie,
          famigliaMoltoEsigente: card?.famigliaMoltoEsigente,
          richiestaAutonomia: card?.richiestaAutonomia,
          datoreSpessoPresente: card?.datoreSpessoPresente,
          richiestaDiscrezione: card?.richiestaDiscrezione,
          comunicareBeneItaliano: card?.comunicareBeneItaliano,
          comunicareBeneInglese: card?.comunicareBeneInglese,
          presenzaNeonati: card?.presenzaNeonati,
          piuBambini: card?.piuBambini,
          famiglia4Persone: card?.famiglia4Persone,
          caniPiccoli: card?.caniPiccoli,
          caniGrandi: card?.caniGrandi,
          gatti: card?.gatti,
          pulireRipianiAlti: card?.pulireRipianiAlti,
          stirare: card?.stirare,
          stirareAbitiDifficili: card?.stirareAbitiDifficili,
          cucinare: card?.cucinare,
          cucinareElaborato: card?.cucinareElaborato,
          curaPiante: card?.curaPiante,
        }}
        onPatchProcess={patchProcess}
        requiredMissingFields={requiredMissingFields}
        useSectionBlocks
        titleAction={resolvedSectionAction}
        sectionsCollapsible={shouldCollapseSections}
        firstSectionDefaultOpen={sectionsDefaultOpen}
        sectionsDefaultOpen={sectionsDefaultOpen}
        showFamiglia={showFamiglia}
        showCasa={showCasa}
        showAnimali={showAnimali}
        showMansioni={showMansioni}
        showRichiesteSpecifiche={showRichiesteSpecifiche}
        sectionContainerProps={{
          famiglia: sectionContainerProps?.famiglia,
          casa: sectionContainerProps?.casa,
          animali: sectionContainerProps?.animali,
          mansioni: sectionContainerProps?.mansioni,
          "richieste-specifiche":
            sectionContainerProps?.["richieste-specifiche"],
        }}
      />

      {showTempistiche ? (
        <div {...sectionContainerProps?.tempistiche}>
          <DetailSectionBlock
            title="Tempistiche"
            icon={<TimerResetIcon className="size-4" />}
            action={resolvedSectionAction}
            showDefaultAction={false}
            collapsible={shouldCollapseSections}
            defaultOpen={sectionsDefaultOpen}
            contentClassName="space-y-4"
          >
          <Field>
            <FieldLabel htmlFor="onboarding-deadline">Deadline</FieldLabel>
            <FieldDeadline name="deadline_mobile" />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-disponibilita-incontro">
              Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
            </FieldLabel>
            <FieldInput
              name="disponibilita_colloqui_in_presenza"
              id="onboarding-disponibilita-incontro"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
              Seleziona la tipologia del primo incontro
            </FieldLabel>
            <FieldOnboardingLookupSelect
              name="tipo_incontro_famiglia_lavoratore"
              options={tipoIncontroOptions}
              placeholder="Seleziona tipologia"
              triggerId="onboarding-tipologia-primo-incontro"
              triggerClassName="w-full"
            />
          </Field>

          <Field>
            <FieldLabel>Fee concordata</FieldLabel>
            <FieldInput
              name="fee_concordata"
              type="number"
              step="0.01"
              disabled={!card?.richiestaAttivazioneId}
              placeholder="-"
            />
          </Field>
          <CopyableUrlField
            label="Link preventivo"
            value={preventivoAcceptanceUrl}
            copyLabel="Link preventivo"
            copyButtonLabel="Copia link"
            openButtonLabel="Vai al link"
            onCopy={copyToClipboard}
          />
          <CopyableUrlField
            label="Link area privata"
            value={privateAreaUrl}
            copyLabel="Link area privata"
            copyButtonLabel="Copia link"
            openButtonLabel="Vai al link"
            onCopy={copyToClipboard}
          />
          <Field>
            <div className="mb-1 flex items-center gap-2">
              <FieldLabel>URL origine</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!card?.origineUrl}
                onClick={() => copyToClipboard(card?.origineUrl ?? "", "URL origine")}
                aria-label="Copia URL origine"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
            <Input value={card?.origineUrl ?? "-"} readOnly />
          </Field>
          <Field>
            <FieldLabel>Sconto applicato</FieldLabel>
            <FieldOnboardingLookupSelect
              name="offerta"
              options={scontoApplicatoOptions}
              placeholder="Seleziona sconto"
            />
          </Field>
          </DetailSectionBlock>
        </div>
      ) : null}
    </div>
  );

  if (flattenSections) {
    return <Form {...form}>{flattenedContent}</Form>;
  }

  return (
    <Form {...form}>
    <CrmDetailCard title={showTitle ? "Onboarding" : ""} titleAction={availabilitySaveAction}>
      <FieldGroup>
        <p className="text-base font-semibold">Orari e frequenza</p>
        <Field>
          <FieldLabel htmlFor="onboarding-orario-lavoro" className="font-semibold">
            Orario di lavoro
          </FieldLabel>
          <FieldDescription>
            Cerca di essere il più chiaro possibile e mantieni il formato del
            placeholder; in caso di più giornate specifica indicando
            &quot;OPPURE&quot;.
          </FieldDescription>
          <FieldInput
            name="orario_di_lavoro"
            id="onboarding-orario-lavoro"
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <FieldInput
              name="ore_settimanale"
              id="onboarding-ore-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              placeholder="8"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <FieldInput
              name="numero_giorni_settimanali"
              id="onboarding-giorni-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              placeholder="8"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <FieldWeekdayPicker name="preferenza_giorno" />
          </Field>
        </div>

        <Separator />

        <p className="text-base font-semibold">Descrizione lavoro</p>
        <OnboardingDecisioneLavoroSection
          checkboxDefaults={checkboxDefaults}
          lookupOptionsByField={lookupOptionsByField}
          defaults={{
            nucleoFamigliare: card?.nucleoFamigliare,
            descrizioneCasa: card?.descrizioneCasa,
            metraturaCasa: card?.metraturaCasa,
            descrizioneAnimaliInCasa: card?.descrizioneAnimaliInCasa,
            mansioniRichieste: card?.mansioniRichieste,
            informazioniExtraRiservate: card?.informazioniExtraRiservate,
            etaMinima: card?.etaMinima,
            etaMassima: card?.etaMassima,
            descrizioneRichiestaTrasferte: card?.descrizioneRichiestaTrasferte,
            descrizioneRichiestaFerie: card?.descrizioneRichiestaFerie,
            patenteDettaglio: card?.patenteDettaglio,
            sesso: card?.sesso,
            richiestaPatente: card?.richiestaPatente,
            richiestaTrasferte: card?.richiestaTrasferte,
            richiestaFerie: card?.richiestaFerie,
            nazionalitaEscluse: card?.nazionalitaEscluse,
            nazionalitaObbligatorie: card?.nazionalitaObbligatorie,
            famigliaMoltoEsigente: card?.famigliaMoltoEsigente,
            richiestaAutonomia: card?.richiestaAutonomia,
            datoreSpessoPresente: card?.datoreSpessoPresente,
            richiestaDiscrezione: card?.richiestaDiscrezione,
            comunicareBeneItaliano: card?.comunicareBeneItaliano,
            comunicareBeneInglese: card?.comunicareBeneInglese,
            presenzaNeonati: card?.presenzaNeonati,
            piuBambini: card?.piuBambini,
            famiglia4Persone: card?.famiglia4Persone,
            caniPiccoli: card?.caniPiccoli,
            caniGrandi: card?.caniGrandi,
            gatti: card?.gatti,
            pulireRipianiAlti: card?.pulireRipianiAlti,
            stirare: card?.stirare,
            stirareAbitiDifficili: card?.stirareAbitiDifficili,
            cucinare: card?.cucinare,
            cucinareElaborato: card?.cucinareElaborato,
            curaPiante: card?.curaPiante,
          }}
          onPatchProcess={patchProcess}
        />

        <Separator />

          <p className="text-base font-semibold">Luogo di lavoro</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="onboarding-provincia">Provincia</FieldLabel>
                <FieldProvinciaSelect
                  name="provincia_sigla"
                  options={orderedProvinciaOptions}
                />
            </Field>
            <Field>
              <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
                <FieldInput
                  name="cap"
                  id="onboarding-cap"
                  placeholder="20158"
                />
              </Field>
            </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="onboarding-via">Via</FieldLabel>
                  <FieldInput name="via" id="onboarding-via" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
                  <FieldInput name="note" id="onboarding-quartiere" />
                  </Field>
              </div>
            <Field>
              <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
              <FieldInput name="src_embed_maps_annucio" id="onboarding-src-maps-edit" />
            </Field>
            </div>

        {showTempistiche ? (
          <>
            <Separator />

            <p className="text-base font-semibold">Tempistiche</p>
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="onboarding-deadline">Deadline</FieldLabel>
                <FieldDeadline name="deadline_mobile" />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-disponibilita-incontro">
                  Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
                </FieldLabel>
                <FieldInput
                  name="disponibilita_colloqui_in_presenza"
                  id="onboarding-disponibilita-incontro"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
                  Seleziona la tipologia del primo incontro
                </FieldLabel>
                <FieldOnboardingLookupSelect
                  name="tipo_incontro_famiglia_lavoratore"
                  options={tipoIncontroOptions}
                  placeholder="Seleziona tipologia"
                  triggerId="onboarding-tipologia-primo-incontro"
                  triggerClassName="w-full"
                />
              </Field>

              <Field>
                <FieldLabel>Fee concordata</FieldLabel>
                <FieldInput
                  name="fee_concordata"
                  type="number"
                  step="0.01"
                  disabled={!card?.richiestaAttivazioneId}
                  placeholder="-"
                />
              </Field>
              <CopyableUrlField
                label="Link preventivo"
                value={preventivoAcceptanceUrl}
                copyLabel="Link preventivo"
                copyButtonLabel="Copia link"
                openButtonLabel="Vai al link"
                onCopy={copyToClipboard}
              />
              <CopyableUrlField
                label="Link area privata"
                value={privateAreaUrl}
                copyLabel="Link area privata"
                copyButtonLabel="Copia link"
                openButtonLabel="Vai al link"
                onCopy={copyToClipboard}
              />
              <Field>
                <div className="mb-1 flex items-center gap-2">
                  <FieldLabel>URL origine</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!card?.origineUrl}
                    onClick={() => copyToClipboard(card?.origineUrl ?? "", "URL origine")}
                    aria-label="Copia URL origine"
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
                <Input value={card?.origineUrl ?? "-"} readOnly />
              </Field>
              <Field>
                <FieldLabel>Sconto applicato</FieldLabel>
                <FieldOnboardingLookupSelect
                  name="offerta"
                  options={scontoApplicatoOptions}
                  placeholder="Seleziona sconto"
                />
              </Field>
            </div>
          </>
        ) : null}
      </FieldGroup>
    </CrmDetailCard>
    </Form>
  );
}
