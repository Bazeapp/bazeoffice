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
} from "@/components/crm/cards/onboarding-decisione-lavoro-card";
import { CrmDetailCard } from "@/components/crm/detail-card";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DebouncedInput } from "@/components/ui/debounced-input";
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
} from "@/hooks/use-crm-pipeline-preview";
import { invokeEdgeFunction } from "@/lib/supabase-edge";
import { cn } from "@/lib/utils";
import { updateRecord } from "@/lib/anagrafiche-api";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
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
  const [indirizzoProvincia, setIndirizzoProvincia] = React.useState(
    toInputValue(card?.indirizzoProvinciaSigla || card?.indirizzoProvincia),
  );
  const anchor = useComboboxAnchor();
  const [deadline, setDeadline] = React.useState("");
  const [tipoIncontro, setTipoIncontro] = React.useState("");
  const [isSavingAvailability, setIsSavingAvailability] = React.useState(false);

  // Source of truth for availability fields = the card prop (server state).
  // No local useState mirror to avoid Realtime echo resetting user edits.
  const orarioDiLavoro = toInputValue(card?.orarioDiLavoro);
  const oreSettimanali = toInputValue(card?.oreSettimana);
  const giorniSettimanali = toInputValue(card?.giorniSettimana);
  const giornatePreferite = React.useMemo(
    () => normalizeWeekdayList(card?.giornatePreferite),
    [card?.giornatePreferite],
  );

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

  React.useEffect(() => {
    setIndirizzoProvincia(
      toInputValue(card?.indirizzoProvinciaSigla || card?.indirizzoProvincia),
    );
  }, [card?.id, card?.indirizzoProvinciaSigla, card?.indirizzoProvincia]);

  React.useEffect(() => {
    setDeadline(toInputValue(card?.deadlineMobile));
    setTipoIncontro(toInputValue(card?.tipoIncontroFamigliaLavoratore));
  }, [card?.id, card?.deadlineMobile, card?.tipoIncontroFamigliaLavoratore]);

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

  const { value: indirizzoCap, onChange: onIndirizzoCapChange } = useDebouncedSave(
    toInputValue(card?.indirizzoCap),
    async (value) => { await patchAddress({ cap: value || null }); },
  );
  const { value: indirizzoVia, onChange: onIndirizzoViaChange } = useDebouncedSave(
    toInputValue(card?.indirizzoVia),
    async (value) => { await patchAddress({ via: value || null }); },
  );
  const { value: indirizzoNote, onChange: onIndirizzoNoteChange } = useDebouncedSave(
    toInputValue(card?.indirizzoNote),
    async (value) => { await patchAddress({ note: value || null }); },
  );
  const { value: srcMapsUrl, onChange: onSrcMapsUrlChange } = useDebouncedSave(
    toInputValue(card?.srcEmbedMapsAnnucio),
    async (value) => { await patchProcess({ src_embed_maps_annucio: value || null }); },
  );
  const { value: disponibilitaColloqui, onChange: onDisponibilitaColloquiChange } = useDebouncedSave(
    toInputValue(card?.disponibilitaColloquiInPresenza),
    async (value) => { await patchProcess({ disponibilita_colloqui_in_presenza: value || null }); },
  );
  const { value: feeConcordata, onChange: onFeeConcordataChange } = useDebouncedSave(
    card?.feeConcordata != null ? String(card.feeConcordata) : "",
    async (value) => {
      if (!richiestaAttivazioneId) return;
      const normalized = value.trim().replace(",", ".");
      const nextValue = normalized ? Number(normalized) : null;
      if (normalized && Number.isNaN(nextValue)) {
        toast.error("Fee concordata non valida");
        return;
      }
      await updateRecord("richieste_attivazione", richiestaAttivazioneId, { fee_concordata: nextValue });
    },
  );

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
  const selectedIndirizzoProvincia = getSelectedLookupValue(
    indirizzoProvincia,
    orderedProvinciaOptions,
  );
  const isRequiredMissing = React.useCallback(
    (field: string) => requiredMissingFields.includes(field),
    [requiredMissingFields],
  );
  const scontoApplicatoOptions = React.useMemo(() => {
    const fromLookup = lookupOptionsByField?.offerta ?? [];
    return fromLookup.length > 0 ? fromLookup : SCONTO_APPLICATO_OPTIONS;
  }, [lookupOptionsByField]);
  const selectedScontoApplicato = getSelectedLookupValue(
    card?.scontoApplicatoRaw ?? card?.scontoApplicato,
    scontoApplicatoOptions,
  );
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
          <DebouncedInput
            id="onboarding-orario-lavoro"
            className={cn(isRequiredMissing("orarioDiLavoro") && REQUIRED_FIELD_CLASS)}
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
            committedValue={orarioDiLavoro}
            onSave={async (value) => {
              await patchProcess({ orario_di_lavoro: value || null });
              scheduleFamilyAvailabilityRefresh();
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field invalid={isRequiredMissing("oreSettimana")}>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <DebouncedInput
              id="onboarding-ore-settimanali"
              className={cn(isRequiredMissing("oreSettimana") && REQUIRED_FIELD_CLASS)}
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              committedValue={oreSettimanali}
              placeholder="8"
              onSave={async (raw) => {
                const value = clampNumericInput(raw, 52);
                await patchProcess({ ore_settimanale: value || null });
                scheduleFamilyAvailabilityRefresh();
              }}
            />
          </Field>

          <Field invalid={isRequiredMissing("giorniSettimana")}>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <DebouncedInput
              id="onboarding-giorni-settimanali"
              className={cn(isRequiredMissing("giorniSettimana") && REQUIRED_FIELD_CLASS)}
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              committedValue={giorniSettimanali}
              placeholder="8"
              onSave={async (raw) => {
                const value = clampNumericInput(raw, 7);
                await patchProcess({ numero_giorni_settimanali: value || null });
                scheduleFamilyAvailabilityRefresh();
              }}
            />
          </Field>

          <Field invalid={isRequiredMissing("giornatePreferite")}>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <Combobox
              key={`giornate-preferite-${card?.id ?? "new"}`}
              multiple
              autoHighlight
              items={WEEKDAY_ITEMS}
              value={giornatePreferite}
              onValueChange={(nextValues) => {
                const normalized = normalizeWeekdayList(nextValues as string[]);
                void patchProcess({ preferenza_giorno: normalized });
                scheduleFamilyAvailabilityRefresh();
              }}
            >
              <ComboboxChips
                ref={anchor}
                id="onboarding-giornate-preferite"
                className={cn(
                  "w-full",
                  isRequiredMissing("giornatePreferite") && REQUIRED_FIELD_CLASS,
                )}
              >
                <ComboboxValue>
                  {(values) => (
                    <>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>
                          {value}
                        </ComboboxChip>
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
            <Select
              value={selectedIndirizzoProvincia}
              onValueChange={(next) => {
                void patchAddress({ provincia_sigla: next || null });
              }}
            >
              <SelectTrigger
                id="onboarding-provincia"
                className={cn(
                  "w-full",
                  isRequiredMissing("indirizzoProvincia") && REQUIRED_FIELD_CLASS,
                )}
              >
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {orderedProvinciaOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field invalid={isRequiredMissing("indirizzoCap")}>
            <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
            <Input
              id="onboarding-cap"
              className={cn(isRequiredMissing("indirizzoCap") && REQUIRED_FIELD_CLASS)}
              placeholder="20158"
              value={indirizzoCap}
              onChange={(event) => onIndirizzoCapChange(event.target.value)}
            />
          </Field>
        </div>

	        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
	          <Field invalid={isRequiredMissing("indirizzoVia")}>
	            <FieldLabel htmlFor="onboarding-via">Via</FieldLabel>
	            <Input
	              id="onboarding-via"
	              className={cn(isRequiredMissing("indirizzoVia") && REQUIRED_FIELD_CLASS)}
	              value={indirizzoVia}
	              onChange={(event) => onIndirizzoViaChange(event.target.value)}
	            />
	          </Field>
	          <Field invalid={isRequiredMissing("indirizzoNote")}>
	            <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
	            <Input
	              id="onboarding-quartiere"
	              className={cn(isRequiredMissing("indirizzoNote") && REQUIRED_FIELD_CLASS)}
	              value={indirizzoNote}
	              onChange={(event) => onIndirizzoNoteChange(event.target.value)}
	            />
	          </Field>
	        </div>
        <Field invalid={isRequiredMissing("srcEmbedMapsAnnucio")}>
          <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
          <Input
            id="onboarding-src-maps-edit"
            className={cn(isRequiredMissing("srcEmbedMapsAnnucio") && REQUIRED_FIELD_CLASS)}
            value={srcMapsUrl}
            onChange={(event) => onSrcMapsUrlChange(event.target.value)}
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
            <DatePicker
              value={deadline}
              onValueChange={(next) => {
                setDeadline(next);
                void patchProcess({
                  deadline_mobile: next ? toIsoDate(next) : null,
                });
              }}
              placeholder="dd/mm/yyyy"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-disponibilita-incontro">
              Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
            </FieldLabel>
            <Input
              id="onboarding-disponibilita-incontro"
              value={disponibilitaColloqui}
              onChange={(event) => onDisponibilitaColloquiChange(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
              Seleziona la tipologia del primo incontro
            </FieldLabel>
            <Select
              value={getSelectedLookupValue(tipoIncontro, tipoIncontroOptions)}
              onValueChange={(next) => {
                const nextValue = getLookupLabelForSave(next, tipoIncontroOptions);
                setTipoIncontro(nextValue);
                void patchProcess({
                  tipo_incontro_famiglia_lavoratore: nextValue || null,
                });
              }}
            >
              <SelectTrigger id="onboarding-tipologia-primo-incontro" className="w-full">
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {tipoIncontroOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Fee concordata</FieldLabel>
            <Input
              type="number"
              step="0.01"
              value={feeConcordata}
              disabled={!card?.richiestaAttivazioneId}
              onChange={(event) => onFeeConcordataChange(event.target.value)}
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
            <Select
              value={selectedScontoApplicato || undefined}
              onValueChange={(value) => {
                const nextValue = getLookupLabelForSave(value, scontoApplicatoOptions);
                void patchProcess({ offerta: nextValue || null });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona sconto" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {scontoApplicatoOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          </DetailSectionBlock>
        </div>
      ) : null}
    </div>
  );

  if (flattenSections) {
    return flattenedContent;
  }

  return (
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
          <DebouncedInput
            id="onboarding-orario-lavoro"
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
            committedValue={orarioDiLavoro}
            onSave={async (value) => {
              await patchProcess({ orario_di_lavoro: value || null });
              scheduleFamilyAvailabilityRefresh();
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <DebouncedInput
              id="onboarding-ore-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              committedValue={oreSettimanali}
              placeholder="8"
              onSave={async (raw) => {
                const value = clampNumericInput(raw, 52);
                await patchProcess({ ore_settimanale: value || null });
                scheduleFamilyAvailabilityRefresh();
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <DebouncedInput
              id="onboarding-giorni-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              committedValue={giorniSettimanali}
              placeholder="8"
              onSave={async (raw) => {
                const value = clampNumericInput(raw, 7);
                await patchProcess({ numero_giorni_settimanali: value || null });
                scheduleFamilyAvailabilityRefresh();
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <Combobox
              key={`giornate-preferite-${card?.id ?? "new"}`}
              multiple
              autoHighlight
              items={WEEKDAY_ITEMS}
              value={giornatePreferite}
              onValueChange={(nextValues) => {
                const normalized = normalizeWeekdayList(nextValues as string[]);
                void patchProcess({ preferenza_giorno: normalized });
                scheduleFamilyAvailabilityRefresh();
              }}
            >
              <ComboboxChips ref={anchor} id="onboarding-giornate-preferite" className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>
                          {value}
                        </ComboboxChip>
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
	              <Select
	                value={selectedIndirizzoProvincia}
	                onValueChange={(next) => {
	                  void patchAddress({ provincia_sigla: next || null });
	                }}
	              >
                <SelectTrigger id="onboarding-provincia" className="w-full">
                  <SelectValue placeholder="Seleziona provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {orderedProvinciaOptions.map((option) => (
                      <SelectItem key={option.valueKey} value={option.valueKey}>
                        {option.valueLabel}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
	              <Input
	                id="onboarding-cap"
	                placeholder="20158"
	                value={indirizzoCap}
	                onChange={(event) => onIndirizzoCapChange(event.target.value)}
	              />
	            </Field>
	          </div>

		          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
		            <Field>
		              <FieldLabel htmlFor="onboarding-via">Via</FieldLabel>
		              <Input
		                id="onboarding-via"
		                value={indirizzoVia}
		                onChange={(event) => onIndirizzoViaChange(event.target.value)}
		              />
		            </Field>
		            <Field>
		              <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
		              <Input
		                id="onboarding-quartiere"
		                value={indirizzoNote}
		                onChange={(event) => onIndirizzoNoteChange(event.target.value)}
		              />
			            </Field>
		          </div>
	          <Field>
	            <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
	            <Input
	              id="onboarding-src-maps-edit"
	              value={srcMapsUrl}
	              onChange={(event) => onSrcMapsUrlChange(event.target.value)}
	            />
	          </Field>
		        </div>

        {showTempistiche ? (
          <>
            <Separator />

            <p className="text-base font-semibold">Tempistiche</p>
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="onboarding-deadline">Deadline</FieldLabel>
                <DatePicker
                  value={deadline}
                  onValueChange={(next) => {
                    setDeadline(next);
                    void patchProcess({
                      deadline_mobile: next ? toIsoDate(next) : null,
                    });
                  }}
                  placeholder="dd/mm/yyyy"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-disponibilita-incontro">
                  Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
                </FieldLabel>
                <Input
                  id="onboarding-disponibilita-incontro"
                  value={disponibilitaColloqui}
                  onChange={(event) => onDisponibilitaColloquiChange(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
                  Seleziona la tipologia del primo incontro
                </FieldLabel>
                <Select
                  value={getSelectedLookupValue(tipoIncontro, tipoIncontroOptions)}
                  onValueChange={(next) => {
                    const nextValue = getLookupLabelForSave(next, tipoIncontroOptions);
                    setTipoIncontro(nextValue);
                    void patchProcess({
                      tipo_incontro_famiglia_lavoratore: nextValue || null,
                    });
                  }}
                >
                  <SelectTrigger id="onboarding-tipologia-primo-incontro" className="w-full">
                    <SelectValue placeholder="Seleziona tipologia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {tipoIncontroOptions.map((option) => (
                        <SelectItem key={option.valueKey} value={option.valueKey}>
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Fee concordata</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={feeConcordata}
                  disabled={!card?.richiestaAttivazioneId}
                  onChange={(event) => onFeeConcordataChange(event.target.value)}
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
                <Select
                  value={selectedScontoApplicato || undefined}
                  onValueChange={(value) => {
                    const nextValue = getLookupLabelForSave(value, scontoApplicatoOptions);
                    void patchProcess({ offerta: nextValue || null });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sconto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {scontoApplicatoOptions.map((option) => (
                        <SelectItem key={option.valueKey} value={option.valueKey}>
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </>
        ) : null}
      </FieldGroup>
    </CrmDetailCard>
  );
}
