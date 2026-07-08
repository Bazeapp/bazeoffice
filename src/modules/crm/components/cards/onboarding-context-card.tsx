import * as React from "react";
import type { ReactNode } from "react";
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleXIcon,
  Clock3Icon,
  FlameIcon,
  InfoIcon,
  PhoneCallIcon,
  PhoneForwardedIcon,
  SnowflakeIcon,
  TrophyIcon,
  UserRoundXIcon,
} from "lucide-react";

import { romaWallclockToUtcIso, utcIsoToRomaInput } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { CheckboxChip } from "@/components/ui/checkbox";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { useController } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { FieldTextarea } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { onboardingContextFormSchema } from "../../lib/onboarding-schemas";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "../../types";

type OnboardingContextCardProps = {
  card: CrmPipelineCardData | null;
  lookupOptionsByField: LookupOptionsByField;
  className?: string;
  titleAction?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
  onPatchFamily?: (
    familyId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
};

type LookupOption = LookupOptionsByField[string][number];

const EMPTY_SELECT_VALUE = "__empty__";

type StageMeta = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  toneClassName: string;
  transitions: string[];
};

const STAGE_META: Record<string, StageMeta> = {
  warm_lead: {
    title: "Warm - Lead",
    description:
      "Nuovo lead in ingresso. Verifica rapidamente il contesto e porta la famiglia nel primo stato operativo.",
    icon: FlameIcon,
    toneClassName: "border-red-200 bg-red-50 text-red-700",
    transitions: [
      "1. Lead valido, inizi la lavorazione -> HOT - Ingresso",
      "2. Lead fuori target -> Out of target",
      "3. Lead non più recuperabile -> Lost",
    ],
  },
  hot_ingresso: {
    title: "Hot - Ingresso",
    description:
      "Lead qualificata e pronta al primo contatto. Conferma i dati e fai partire la presa in carico sales.",
    icon: PhoneForwardedIcon,
    toneClassName: "border-rose-200 bg-rose-50 text-rose-700",
    transitions: [
      "1. Procedi con i tentativi di chiamata -> HOT - In attesa di primo contatto",
      "2. La famiglia non è lavorabile -> Out of target",
      "3. La famiglia interrompe il percorso -> Lost",
    ],
  },
  hot_in_attesa_di_primo_contatto: {
    title: "Hot - In attesa di primo contatto",
    description:
      "Sei nella fase di primo contatto. Traccia i tentativi senza risposta e aggiorna lo stato appena ottieni un esito.",
    icon: Clock3Icon,
    toneClassName: "border-orange-200 bg-orange-50 text-orange-700",
    transitions: [
      "1. La famiglia risponde -> HOT - Contatto avvenuto",
      "2. I tentativi vanno a vuoto -> HOT - No-show",
      "3. La lead non è più recuperabile -> Lost",
    ],
  },
  hot_contatto_avvenuto: {
    title: "Hot - Contatto avvenuto",
    description:
      "Hai parlato con la famiglia. Usa questa guida per scegliere correttamente il prossimo stato operativo.",
    icon: PhoneCallIcon,
    toneClassName: "border-amber-200 bg-amber-50 text-amber-700",
    transitions: [
      "1. Può fare la call operativa ora -> HOT - Call attivazione fatta",
      "2. Chiede appuntamento -> HOT - Call attivazione prenotata",
      "3. Chiede callback breve -> HOT - Callback programmato",
      "4. Rimanda la decisione -> HOT - Decisione rimandata",
      "5. Vuole ripartire più avanti -> COLD - Ricerca futura",
      "6. Interrompe il percorso -> Lost",
    ],
  },
  hot_call_attivazione_prenotata: {
    title: "Hot - Call attivazione prenotata",
    description:
      "La famiglia ha confermato una call. Registra data e ora e usa il cambio stato quando l’incontro avviene davvero.",
    icon: CalendarClockIcon,
    toneClassName: "border-yellow-200 bg-yellow-50 text-yellow-700",
    transitions: [
      "1. La call viene fatta -> HOT - Call attivazione fatta",
      "2. La famiglia chiede nuovo orario -> HOT - Callback programmato",
      "3. La famiglia non si presenta -> HOT - No-show",
    ],
  },
  hot_call_attivazione_fatta: {
    title: "Hot - Call attivazione fatta",
    description:
      "La call operativa è stata eseguita. Da qui decidi se avviare la ricerca o se serve un follow-up.",
    icon: CheckCircle2Icon,
    toneClassName: "border-lime-200 bg-lime-50 text-lime-700",
    transitions: [
      "1. Preventivo accettato -> WON - In attesa di conferma",
      "2. Serve un passaggio successivo -> HOT - Follow-up post call",
      "3. La famiglia rimanda la decisione -> HOT - Decisione rimandata",
      "4. La famiglia interrompe -> Lost",
    ],
  },
  hot_callback_programmato: {
    title: "Hot - Callback breve",
    description:
      "È previsto un ricontatto rapido. Segnalo il promemoria e registra data e ora del callback.",
    icon: CalendarClockIcon,
    toneClassName: "border-sky-200 bg-sky-50 text-sky-700",
    transitions: [
      "1. Il callback va a buon fine -> HOT - Contatto avvenuto",
      "2. Non risponde al callback -> HOT - No-show",
      "3. Rimanda a una data futura -> COLD - Ricerca futura",
    ],
  },
  hot_no_show: {
    title: "Hot - No-show",
    description:
      "La famiglia non si è fatta trovare. Tieni traccia dei tentativi successivi e scegli il prossimo stato solo quando hai un esito.",
    icon: UserRoundXIcon,
    toneClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
    transitions: [
      "1. La famiglia risponde -> HOT - Contatto avvenuto",
      "2. Chiede di risentirsi -> HOT - Callback programmato",
      "3. Non recuperabile -> Lost",
    ],
  },
  hot_follow_up_post_call: {
    title: "Hot - Follow-up post call",
    description:
      "La call è fatta ma manca ancora un passaggio di allineamento. Usa le transizioni come guida operativa.",
    icon: CalendarClockIcon,
    toneClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    transitions: [
      "1. Conferma finale -> WON - In attesa di conferma",
      "2. Rimanda la decisione -> HOT - Decisione rimandata",
      "3. Chiede nuovo contatto -> HOT - Callback programmato",
      "4. Interrompe -> Lost",
    ],
  },
  hot_decisione_rimandata: {
    title: "Hot - Decisione rimandata",
    description:
      "La famiglia non ha ancora deciso. Mantieni la guida operativa visibile e sposta lo stato appena hai un esito.",
    icon: Clock3Icon,
    toneClassName: "border-violet-200 bg-violet-50 text-violet-700",
    transitions: [
      "1. Conferma di proseguire -> HOT - Call attivazione prenotata",
      "2. Chiede di sentirsi più avanti -> COLD - Ricerca futura",
      "3. Rifiuta definitivamente -> Lost",
    ],
  },
  cold_ricerca_futura: {
    title: "Cold - Ricerca futura",
    description:
      "La famiglia vuole essere ricontattata più avanti. Imposta la data e annota il contesto utile al prossimo follow-up.",
    icon: SnowflakeIcon,
    toneClassName: "border-blue-200 bg-blue-50 text-blue-700",
    transitions: [
      "1. Torna attiva sulla ricerca -> HOT - Ingresso",
      "2. Non è più lavorabile -> Lost",
    ],
  },
  won_in_attesa_di_conferma: {
    title: "Won - In attesa di conferma",
    description:
      "Il preventivo è accettato ma manca la conferma finale per avviare la ricerca. Tieni visibile il gate fino allo sblocco operativo.",
    icon: CheckCircle2Icon,
    toneClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    transitions: [
      "1. Conferma completata -> WON - Ricerca avviata",
      "2. Serve un follow-up -> HOT - Follow-up post call",
      "3. Blocco definitivo -> Lost",
    ],
  },
  won_ricerca_attivata: {
    title: "Won - Ricerca avviata",
    description:
      "La famiglia è stata convertita e la ricerca è partita. Aggiorna solo lo stato operativo della ricerca.",
    icon: TrophyIcon,
    toneClassName: "border-green-200 bg-green-50 text-green-700",
    transitions: [
      "1. La ricerca procede normalmente -> resta in WON - Ricerca avviata",
      "2. Emergere un blocco definitivo -> Lost",
    ],
  },
  lost: {
    title: "Lost",
    description:
      "La lead è persa. Registra la motivazione corretta e aggiungi note utili per eventuali analisi future.",
    icon: CircleXIcon,
    toneClassName: "border-slate-200 bg-slate-50 text-slate-700",
    transitions: [
      "1. Se rientra in funnel in futuro -> WARM - Lead",
    ],
  },
  out_of_target: {
    title: "Out of target",
    description:
      "La lead non rientra nel perimetro operativo. Specifica la ragione e lascia note solo se servono ai report.",
    icon: InfoIcon,
    toneClassName: "border-zinc-200 bg-zinc-50 text-zinc-700",
    transitions: [
      "1. Se il caso rientra nel target dopo verifica -> WARM - Lead",
    ],
  },
};

function splitStoredValues(value: string | null | undefined) {
  if (!value || value === "-") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateTimeLocalValue(value: string | null | undefined) {
  return utcIsoToRomaInput(value);
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim() && value.trim() !== "-");
}

function getBadgeClassName(color: string | null | undefined) {
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
    default:
      return "border-border bg-muted text-foreground";
  }
}

function getStageOption(
  stage: string,
  options: LookupOptionsByField["stato_sales"]
) {
  const token = normalizeToken(stage);
  return options.find(
    (option) =>
      normalizeToken(option.valueKey) === token ||
      normalizeToken(option.valueLabel) === token
  );
}

function resolveOptions(selected: string, options: LookupOption[]) {
  if (options.length > 0) return options;
  if (!hasValue(selected)) return [];
  return [
    {
      valueKey: selected,
      valueLabel: selected,
      color: null,
      sortOrder: null,
    },
  ];
}

function selectedOptionValue(selected: string, options: LookupOption[]) {
  const token = normalizeToken(selected);
  if (!token || token === "-") return "";

  const matched = options.find(
    (option) =>
      normalizeToken(option.valueKey) === token ||
      normalizeToken(option.valueLabel) === token
  );
  return matched?.valueKey ?? selected;
}

function findLookupOption(value: string, options: LookupOption[]) {
  const token = normalizeToken(value);
  if (!token || token === "-") return null;

  return (
    options.find(
      (option) =>
        normalizeToken(option.valueKey) === token ||
        normalizeToken(option.valueLabel) === token
    ) ?? null
  );
}

function normalizeSelectedLookupKeys(values: string[], options: LookupOption[]) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const key = findLookupOption(value, options)?.valueKey ?? value.trim();
    const token = normalizeToken(key);
    if (!key || seen.has(token)) continue;
    result.push(key);
    seen.add(token);
  }

  return result;
}

function ChoiceFieldSet({
  title,
  selected,
  options,
  placeholder = "Seleziona motivazione",
  onValueChange,
}: {
  title: string;
  selected: string;
  options: LookupOption[];
  placeholder?: string;
  onValueChange?: (nextValue: string) => void;
}) {
  const resolved = resolveOptions(selected, options);
  const selectedValue =
    selectedOptionValue(selected, resolved) || EMPTY_SELECT_VALUE;

  if (resolved.length === 0) return null;

  return (
    <Field>
      <FieldLabel>{title}</FieldLabel>
      <Select
        value={selectedValue}
        disabled={!onValueChange}
        onValueChange={(nextValue) => {
          onValueChange?.(
            nextValue === EMPTY_SELECT_VALUE ? "" : nextValue
          );
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={EMPTY_SELECT_VALUE}>
              Nessuna motivazione
            </SelectItem>
            {resolved.map((option) => (
              <SelectItem key={option.valueKey} value={option.valueKey}>
                {option.valueLabel}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function MultiCheckboxField({
  title,
  options,
  value,
  maxVisibleOptions,
  sequential = false,
  onChange,
}: {
  title: string;
  options: LookupOption[];
  value: string[];
  maxVisibleOptions?: number;
  sequential?: boolean;
  onChange: (next: string[]) => void;
}) {
  const visibleOptions =
    typeof maxVisibleOptions === "number"
      ? options.slice(0, maxVisibleOptions)
      : options;
  const selectedKeys = normalizeSelectedLookupKeys(value, options);

  return (
    <FieldSet>
      <FieldLegend variant="label">{title}</FieldLegend>
      <FieldGroup className="flex-row flex-wrap gap-2">
        {visibleOptions.map((option, index) => {
          const checked = selectedKeys.includes(option.valueKey);
          const previousAllChecked =
            !sequential ||
            visibleOptions
              .slice(0, index)
              .every((previous) => selectedKeys.includes(previous.valueKey));
          const disabled = sequential && !checked && !previousAllChecked;
          return (
            <CheckboxChip
              key={option.valueKey}
              id={`check-${title}-${option.valueKey}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(nextChecked) => {
                if (sequential) {
                  if (nextChecked) {
                    onChange(
                      visibleOptions
                        .slice(0, index + 1)
                        .map((item) => item.valueKey)
                    );
                  } else {
                    onChange(
                      value.filter(
                        (item) =>
                          visibleOptions.findIndex(
                            (entry) => entry.valueKey === item
                          ) < index
                      )
                    );
                  }
                  return;
                }

                const next = nextChecked
                  ? [...selectedKeys, option.valueKey]
                  : selectedKeys.filter((item) => item !== option.valueKey);
                onChange(next);
              }}
            >
              {option.valueLabel}
            </CheckboxChip>
          );
        })}
      </FieldGroup>
    </FieldSet>
  );
}

// FASE 5 BIS — thin wrapper form-aware del ChoiceFieldSet locale.
function FieldChoiceSet({
  name,
  title,
  options,
}: {
  name: string;
  title: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  return (
    <ChoiceFieldSet
      title={title}
      selected={typeof field.value === "string" ? field.value : ""}
      options={options}
      onValueChange={field.onChange}
    />
  );
}

// FASE 5 BIS — thin wrapper form-aware del MultiCheckboxField locale (array).
function FieldMultiCheckbox({
  name,
  title,
  options,
  maxVisibleOptions,
  sequential,
}: {
  name: string;
  title: string;
  options: LookupOption[];
  maxVisibleOptions?: number;
  sequential?: boolean;
}) {
  const { field } = useController({ name });
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <MultiCheckboxField
      title={title}
      options={options}
      value={value}
      maxVisibleOptions={maxVisibleOptions}
      sequential={sequential}
      onChange={field.onChange}
    />
  );
}

// FASE 5 BIS — input nativi date/datetime-local agganciati al form. La conversione
// timezone (romaWallclockToUtcIso) avviene in onSave; qui si tiene il wallclock.
function FieldDateInput({
  name,
  id,
  type,
}: {
  name: string;
  id?: string;
  type: "date" | "datetime-local";
}) {
  const { field } = useController({ name });
  return (
    <Input
      id={id}
      type={type}
      value={typeof field.value === "string" ? field.value : ""}
      onChange={(event) => field.onChange(event.target.value)}
    />
  );
}

// FASE 5 BIS — Select "stato operativo" agganciato al form (preserva il fallback
// option e la normalizzazione selectedOptionValue interni).
function FieldStatoOperativo({
  name,
  options,
}: {
  name: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  const selected = typeof field.value === "string" ? field.value : "";
  const renderOptions =
    options.length > 0
      ? options
      : hasValue(selected)
        ? [{ valueKey: selected, valueLabel: selected, color: null, sortOrder: null }]
        : [];
  return (
    <Select value={selectedOptionValue(selected, options)} onValueChange={field.onChange}>
      <SelectTrigger id="onboarding-stato-operativo" className="w-full">
        <SelectValue placeholder="Seleziona stato operativo" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {renderOptions.map((option) => (
            <SelectItem key={option.valueKey} value={option.valueKey}>
              {option.valueLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function cleanValue(value: string | null | undefined) {
  return value && value !== "-" ? value : "";
}

// FASE 5 BIS — defaults del form (chiavi = nomi logici; il routing colonna/target
// process|family avviene in onSave). Ricostruiti ad ogni render dal card.
function buildContextDefaults(card: CrmPipelineCardData | null) {
  return {
    coldAttempts: splitStoredValues(card?.salesColdCallFollowup),
    noShowAttempts: splitStoredValues(card?.salesNoShowFollowup),
    dataRicontatto: card?.dataPerRicercaFuturaRaw
      ? card.dataPerRicercaFuturaRaw.slice(0, 10)
      : "",
    dataCall: toDateTimeLocalValue(card?.dataCallPrenotataRaw),
    noteStato: cleanValue(card?.appuntiChiamataSales),
    motivazioneLost: cleanValue(card?.motivazioneLost),
    motivazioneOot: cleanValue(card?.motivazioneOot),
    statoRes: cleanValue(card?.statoRes),
  };
}

export function OnboardingContextCard({
  card,
  lookupOptionsByField,
  className,
  titleAction,
  collapsible = true,
  defaultOpen = true,
  onPatchProcess,
  onPatchFamily,
}: OnboardingContextCardProps) {
  // FASE 5 BIS — form + autosave. Il form è la source of truth: niente più
  // useState per-campo né dirty-ref manuali (il resync realtime senza clobber è
  // gestito da useAutoSaveForm via keepDirtyValues). onSave instrada ogni campo
  // al target giusto: quasi tutto sul processo, la data call sulla famiglia.
  const form = useAutoSaveForm({
    defaults: buildContextDefaults(card),
    schema: onboardingContextFormSchema,
    onSave: async (patch) => {
      if (!card) return;
      const processPatch: Record<string, unknown> = {};
      const familyPatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        switch (key) {
          case "coldAttempts":
            processPatch.sales_cold_call_followup = (value as string[]).join(", ");
            break;
          case "noShowAttempts":
            processPatch.sales_no_show_followup = (value as string[]).join(", ");
            break;
          case "dataRicontatto":
            processPatch.data_per_ricerca_futura = (value as string) || null;
            break;
          case "noteStato":
            processPatch.appunti_chiamata_sales = (value as string) || null;
            break;
          case "motivazioneLost":
            processPatch.motivazione_lost = (value as string) || null;
            break;
          case "motivazioneOot":
            processPatch.motivazione_oot = (value as string) || null;
            break;
          case "statoRes":
            processPatch.stato_res = (value as string) || null;
            break;
          case "dataCall":
            familyPatch.data_call_prenotata = value
              ? romaWallclockToUtcIso(value as string)
              : null;
            break;
        }
      }
      if (Object.keys(processPatch).length > 0) {
        await onPatchProcess?.(card.id, processPatch);
      }
      if (Object.keys(familyPatch).length > 0) {
        await onPatchFamily?.(card.famigliaId, familyPatch);
      }
    },
  });

  if (!card) return null;

  const stageMeta = STAGE_META[card.stage] ?? STAGE_META.warm_lead;
  const StageIcon = stageMeta.icon;
  const stageOption = getStageOption(card.stage, lookupOptionsByField.stato_sales ?? []);
  const statoOperativoOptions = lookupOptionsByField.stato_res ?? [];

  let contextualFields: ReactNode = null;

  switch (card.stage) {
    case "hot_in_attesa_di_primo_contatto":
      contextualFields = (
        <FieldMultiCheckbox
          name="coldAttempts"
          title="Tentativi di chiamata"
          options={lookupOptionsByField.sales_cold_call_followup ?? []}
          maxVisibleOptions={3}
          sequential
        />
      );
      break;
    case "hot_call_attivazione_prenotata":
    case "hot_callback_programmato":
      contextualFields = (
        <FieldGroup>
          {card.stage === "hot_callback_programmato" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Segna sul tuo calendario questo callback: la sezione serve solo come promemoria operativo.
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="onboarding-data-call">
              {card.stage === "hot_callback_programmato"
                ? "Data e ora callback"
                : "Data chiamata prenotata"}
            </FieldLabel>
            <FieldDateInput
              name="dataCall"
              id="onboarding-data-call"
              type="datetime-local"
            />
          </Field>
        </FieldGroup>
      );
      break;
    case "hot_no_show":
      contextualFields = (
        <FieldMultiCheckbox
          name="noShowAttempts"
          title="Tentativi di chiamata"
          options={lookupOptionsByField.sales_no_show_followup ?? []}
          maxVisibleOptions={2}
          sequential
        />
      );
      break;
    case "cold_ricerca_futura":
      contextualFields = (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="onboarding-data-ricontatto">Data ricontatto</FieldLabel>
            <FieldDateInput
              name="dataRicontatto"
              id="onboarding-data-ricontatto"
              type="date"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-note-cold">Note</FieldLabel>
            <FieldTextarea name="noteStato" id="onboarding-note-cold" />
          </Field>
        </FieldGroup>
      );
      break;
    case "won_ricerca_attivata":
      contextualFields = (
        <Field>
          <FieldLabel htmlFor="onboarding-stato-operativo">Stato operativo</FieldLabel>
          <FieldStatoOperativo name="statoRes" options={statoOperativoOptions} />
        </Field>
      );
      break;
    case "lost":
      contextualFields = (
        <FieldGroup>
          <FieldChoiceSet
            name="motivazioneLost"
            title="Motivazione"
            options={lookupOptionsByField.motivazione_lost ?? []}
          />
          <Field>
            <FieldLabel htmlFor="onboarding-note-lost">Note</FieldLabel>
            <FieldTextarea name="noteStato" id="onboarding-note-lost" />
          </Field>
        </FieldGroup>
      );
      break;
    case "out_of_target":
      contextualFields = (
        <FieldGroup>
          <FieldChoiceSet
            name="motivazioneOot"
            title="Motivazione"
            options={lookupOptionsByField.motivazione_oot ?? []}
          />
          <Field>
            <FieldLabel htmlFor="onboarding-note-oot">Note</FieldLabel>
            <FieldTextarea name="noteStato" id="onboarding-note-oot" />
          </Field>
        </FieldGroup>
      );
      break;
    default:
      contextualFields = null;
  }

  return (
    <Form {...form}>
    <DetailSectionBlock
      title="Onboarding"
      icon={<StageIcon className="size-4" />}
      action={titleAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      className={className}
      contentClassName="space-y-4"
    >
      <div className="space-y-2">
        <Badge
          variant="outline"
          className={getBadgeClassName(stageOption?.color)}
        >
          {stageMeta.title}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {stageMeta.description}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Guida operativa
        </p>
        <ol className="space-y-2 text-sm text-foreground">
          {stageMeta.transitions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
      {contextualFields ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Campi contestuali
          </p>
          {contextualFields}
        </div>
      ) : null}
    </DetailSectionBlock>
    </Form>
  );
}
