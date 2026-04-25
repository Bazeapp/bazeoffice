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

import { Badge } from "@/components/ui-next/badge";
import { Button } from "@/components/ui-next/button";
import { Checkbox } from "@/components/ui-next/checkbox";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui-next/field";
import { Input } from "@/components/ui-next/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { Textarea } from "@/components/ui-next/textarea";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";
import { cn } from "@/lib/utils";

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
      "1. Tutto confermato -> WON - Ricerca avviata",
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
      "1. Conferma finale -> WON - Ricerca avviata",
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
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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

function ChoiceFieldSet({
  title,
  selected,
  options,
  onValueChange,
}: {
  title: string;
  selected: string;
  options: LookupOption[];
  onValueChange?: (nextValue: string) => void;
}) {
  const resolved = resolveOptions(selected, options);
  const selectedValue = selectedOptionValue(selected, resolved);

  if (resolved.length === 0) return null;

  return (
    <FieldSet>
      <FieldLegend variant="label">{title}</FieldLegend>
      <FieldGroup className="gap-2">
        {resolved.map((option) => (
          <Button
            key={option.valueKey}
            type="button"
            variant="outline"
            className={cn(
              "justify-start rounded-xl",
              selectedValue === option.valueKey && "border-foreground"
            )}
            onClick={() => onValueChange?.(option.valueKey)}
          >
            <Badge variant="outline" className={getBadgeClassName(option.color)}>
              {option.valueLabel}
            </Badge>
          </Button>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

function MultiCheckboxField({
  title,
  options,
  value,
  maxVisibleOptions,
  onChange,
}: {
  title: string;
  options: LookupOption[];
  value: string[];
  maxVisibleOptions?: number;
  onChange: (next: string[]) => void;
}) {
  const visibleOptions =
    typeof maxVisibleOptions === "number"
      ? options.slice(0, maxVisibleOptions)
      : options;

  return (
    <FieldSet>
      <FieldLegend variant="label">{title}</FieldLegend>
      <FieldGroup className="gap-2">
        {visibleOptions.map((option) => {
          const checked = value.includes(option.valueKey);
          return (
            <Field key={option.valueKey} orientation="horizontal">
              <Checkbox
                id={`check-${title}-${option.valueKey}`}
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  const next = nextChecked
                    ? [...value, option.valueKey]
                    : value.filter((item) => item !== option.valueKey);
                  onChange(next);
                }}
              />
              <FieldLabel
                htmlFor={`check-${title}-${option.valueKey}`}
                className="font-normal"
              >
                {option.valueLabel}
              </FieldLabel>
            </Field>
          );
        })}
      </FieldGroup>
    </FieldSet>
  );
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
  const [noteStato, setNoteStato] = React.useState(card?.appuntiChiamataSales ?? "");
  const [dataRicontatto, setDataRicontatto] = React.useState(
    card?.dataPerRicercaFuturaRaw ? card.dataPerRicercaFuturaRaw.slice(0, 10) : ""
  );
  const [dataCall, setDataCall] = React.useState(
    toDateTimeLocalValue(card?.dataCallPrenotataRaw)
  );
  const [coldAttempts, setColdAttempts] = React.useState<string[]>(
    splitStoredValues(card?.salesColdCallFollowup)
  );
  const [noShowAttempts, setNoShowAttempts] = React.useState<string[]>(
    splitStoredValues(card?.salesNoShowFollowup)
  );

  React.useEffect(() => {
    setNoteStato(card?.appuntiChiamataSales === "-" ? "" : card?.appuntiChiamataSales ?? "");
    setDataRicontatto(card?.dataPerRicercaFuturaRaw ? card.dataPerRicercaFuturaRaw.slice(0, 10) : "");
    setDataCall(toDateTimeLocalValue(card?.dataCallPrenotataRaw));
    setColdAttempts(splitStoredValues(card?.salesColdCallFollowup));
    setNoShowAttempts(splitStoredValues(card?.salesNoShowFollowup));
  }, [
    card?.appuntiChiamataSales,
    card?.dataPerRicercaFuturaRaw,
    card?.dataCallPrenotataRaw,
    card?.salesColdCallFollowup,
    card?.salesNoShowFollowup,
    card?.id,
  ]);

  if (!card) return null;

  const stageMeta = STAGE_META[card.stage] ?? STAGE_META.warm_lead;
  const StageIcon = stageMeta.icon;
  const stageOption = getStageOption(card.stage, lookupOptionsByField.stato_sales ?? []);
  const statoOperativoOptions = lookupOptionsByField.stato_res ?? [];

  let contextualFields: ReactNode = null;

  switch (card.stage) {
    case "hot_in_attesa_di_primo_contatto":
      contextualFields = (
        <MultiCheckboxField
          title="Tentativi di chiamata"
          options={lookupOptionsByField.sales_cold_call_followup ?? []}
          value={coldAttempts}
          maxVisibleOptions={3}
          onChange={(next) => {
            setColdAttempts(next);
            void onPatchProcess?.(card.id, {
              sales_cold_call_followup: next.join(", "),
            });
          }}
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
            <Input
              id="onboarding-data-call"
              type="datetime-local"
              value={dataCall}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDataCall(nextValue);
                void onPatchFamily?.(card.famigliaId, {
                  data_call_prenotata: nextValue || null,
                });
              }}
            />
          </Field>
        </FieldGroup>
      );
      break;
    case "hot_no_show":
      contextualFields = (
        <MultiCheckboxField
          title="Tentativi di chiamata"
          options={lookupOptionsByField.sales_no_show_followup ?? []}
          value={noShowAttempts}
          maxVisibleOptions={2}
          onChange={(next) => {
            setNoShowAttempts(next);
            void onPatchProcess?.(card.id, {
              sales_no_show_followup: next.join(", "),
            });
          }}
        />
      );
      break;
    case "cold_ricerca_futura":
      contextualFields = (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="onboarding-data-ricontatto">Data ricontatto</FieldLabel>
            <Input
              id="onboarding-data-ricontatto"
              type="date"
              value={dataRicontatto}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDataRicontatto(nextValue);
                void onPatchProcess?.(card.id, {
                  data_per_ricerca_futura: nextValue || null,
                });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-note-cold">Note</FieldLabel>
            <Textarea
              id="onboarding-note-cold"
              value={noteStato}
              onChange={(event) => setNoteStato(event.target.value)}
              onBlur={() => {
                void onPatchProcess?.(card.id, {
                  appunti_chiamata_sales: noteStato || null,
                });
              }}
            />
          </Field>
        </FieldGroup>
      );
      break;
    case "won_ricerca_attivata":
      contextualFields = (
        <Field>
          <FieldLabel htmlFor="onboarding-stato-operativo">Stato operativo</FieldLabel>
          <Select
            value={selectedOptionValue(card.statoRes, statoOperativoOptions)}
            onValueChange={(next) => {
              void onPatchProcess?.(card.id, {
                stato_res: next || null,
              });
            }}
          >
            <SelectTrigger id="onboarding-stato-operativo" className="w-full">
              <SelectValue placeholder="Seleziona stato operativo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(statoOperativoOptions.length > 0
                  ? statoOperativoOptions
                  : hasValue(card.statoRes)
                    ? [{
                        valueKey: card.statoRes,
                        valueLabel: card.statoRes,
                        color: null,
                        sortOrder: null,
                      }]
                    : []
                ).map((option) => (
                  <SelectItem key={option.valueKey} value={option.valueKey}>
                    {option.valueLabel}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      );
      break;
    case "lost":
      contextualFields = (
        <FieldGroup>
          <ChoiceFieldSet
            title="Motivazione"
            selected={card.motivazioneLost}
            options={lookupOptionsByField.motivazione_lost ?? []}
            onValueChange={(next) => {
              void onPatchProcess?.(card.id, {
                motivazione_lost: next || null,
              });
            }}
          />
          <Field>
            <FieldLabel htmlFor="onboarding-note-lost">Note</FieldLabel>
            <Textarea
              id="onboarding-note-lost"
              value={noteStato}
              onChange={(event) => setNoteStato(event.target.value)}
              onBlur={() => {
                void onPatchProcess?.(card.id, {
                  appunti_chiamata_sales: noteStato || null,
                });
              }}
            />
          </Field>
        </FieldGroup>
      );
      break;
    case "out_of_target":
      contextualFields = (
        <FieldGroup>
          <ChoiceFieldSet
            title="Motivazione"
            selected={card.motivazioneOot}
            options={lookupOptionsByField.motivazione_oot ?? []}
            onValueChange={(next) => {
              void onPatchProcess?.(card.id, {
                motivazione_oot: next || null,
              });
            }}
          />
          <Field>
            <FieldLabel htmlFor="onboarding-note-oot">Note</FieldLabel>
            <Textarea
              id="onboarding-note-oot"
              value={noteStato}
              onChange={(event) => setNoteStato(event.target.value)}
              onBlur={() => {
                void onPatchProcess?.(card.id, {
                  appunti_chiamata_sales: noteStato || null,
                });
              }}
            />
          </Field>
        </FieldGroup>
      );
      break;
    default:
      contextualFields = null;
  }

  return (
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
  );
}
