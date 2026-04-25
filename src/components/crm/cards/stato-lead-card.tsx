import * as React from "react";
import type { ReactNode } from "react";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { Badge } from "@/components/ui-next/badge";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui-next/field";
import { DatePicker } from "@/components/ui-next/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui-next/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { Textarea } from "@/components/ui-next/textarea";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";

type StatoLeadCardProps = {
  card: CrmPipelineCardData | null;
  lookupOptionsByField: LookupOptionsByField;
  titleAction?: ReactNode;
  title?: string;
  showStageField?: boolean;
  onChangeStage?: (
    processId: string,
    targetStageId: string,
  ) => void | Promise<void>;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
};

type LookupOption = LookupOptionsByField[string][number];

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function renderValue(value: string | null | undefined) {
  if (!value) return "-";
  const normalized = value.trim();
  return normalized ? normalized : "-";
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

function hasValue(value: string | null | undefined) {
  return renderValue(value) !== "-";
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
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
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function getSelectItemClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "bg-red-50 text-red-700";
    case "rose":
      return "bg-rose-50 text-rose-700";
    case "orange":
      return "bg-orange-50 text-orange-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "yellow":
      return "bg-yellow-50 text-yellow-700";
    case "lime":
      return "bg-lime-50 text-lime-700";
    case "green":
      return "bg-green-50 text-green-700";
    case "emerald":
      return "bg-emerald-50 text-emerald-700";
    case "teal":
      return "bg-teal-50 text-teal-700";
    case "cyan":
      return "bg-cyan-50 text-cyan-700";
    case "sky":
      return "bg-sky-50 text-sky-700";
    case "blue":
      return "bg-blue-50 text-blue-700";
    case "indigo":
      return "bg-indigo-50 text-indigo-700";
    case "violet":
      return "bg-violet-50 text-violet-700";
    case "purple":
      return "bg-purple-50 text-purple-700";
    case "fuchsia":
      return "bg-fuchsia-50 text-fuchsia-700";
    case "pink":
      return "bg-pink-50 text-pink-700";
    case "slate":
      return "bg-slate-50 text-slate-700";
    case "gray":
      return "bg-gray-50 text-gray-700";
    case "zinc":
      return "bg-zinc-50 text-zinc-700";
    case "neutral":
      return "bg-neutral-50 text-neutral-700";
    case "stone":
      return "bg-stone-50 text-stone-700";
    default:
      return "";
  }
}

function getStageGroupKey(valueKey: string) {
  const normalized = normalizeToken(valueKey);
  if (normalized.startsWith("warm_")) return "warm";
  if (normalized.startsWith("hot_")) return "hot";
  if (normalized.startsWith("cold_")) return "cold";
  if (normalized.startsWith("won_")) return "won";
  if (normalized === "lost") return "lost";
  if (normalized === "out_of_target") return "out_of_target";
  return "other";
}

function getStageGroupLabel(groupKey: string) {
  switch (groupKey) {
    case "warm":
      return "WARM";
    case "hot":
      return "HOT";
    case "cold":
      return "COLD";
    case "won":
      return "WON";
    case "lost":
      return "LOST";
    case "out_of_target":
      return "OUT OF TARGET";
    default:
      return "Altri";
  }
}

function getContextualCardTitle(stage: string) {
  switch (stage) {
    case "hot_in_attesa_di_primo_contatto":
      return "Onboarding - Primo contatto"
    case "hot_contatto_avvenuto":
      return "Onboarding - Esito contatto"
    case "hot_callback_programmato":
      return "Onboarding - Callback"
    case "hot_call_attivazione_prenotata":
      return "Onboarding - Call attivazione prenotata"
    case "hot_no_show":
      return "Onboarding - No-show"
    case "cold_ricerca_futura":
      return "Onboarding - Ricerca futura"
    case "lost":
      return "Onboarding - Lost"
    case "out_of_target":
      return "Onboarding - Out of target"
    default:
      return "Onboarding contestuale"
  }
}

function resolveOptions(
  selected: string,
  options: LookupOption[],
): LookupOption[] {
  const selectedToken = normalizeToken(selected);
  if (options.length > 0) return options;
  if (!selectedToken || selectedToken === "-") return [];

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

  const matched = options.find((option) => {
    return (
      normalizeToken(option.valueKey) === token ||
      normalizeToken(option.valueLabel) === token
    );
  });

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
  const [localValue, setLocalValue] = React.useState(selectedValue);

  React.useEffect(() => {
    setLocalValue(selectedValue);
  }, [selectedValue]);

  if (resolved.length === 0) {
    return null;
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{title}</FieldLegend>
      <RadioGroup
        value={localValue}
        onValueChange={(next) => {
          setLocalValue(next);
          onValueChange?.(next);
        }}
        className="gap-2"
      >
        {resolved.map((option, index) => {
          const id = `stato-lead-choice-${option.valueKey}-${index}`;
          return (
            <Field key={id} orientation="horizontal">
              <RadioGroupItem id={id} value={option.valueKey} />
              <FieldLabel htmlFor={id} className="font-normal">
                <Badge
                  variant="outline"
                  className={getBadgeClassName(option.color)}
                >
                  {formatLabel(option.valueLabel)}
                </Badge>
              </FieldLabel>
            </Field>
          );
        })}
      </RadioGroup>
    </FieldSet>
  );
}

function StageRules({ lines }: { lines: string[] }) {
  return (
    <FieldGroup>
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="text-sm leading-6">
          {line}
        </p>
      ))}
    </FieldGroup>
  );
}

export function StatoLeadCard({
  card,
  lookupOptionsByField,
  titleAction,
  title,
  showStageField = true,
  onChangeStage,
  onPatchProcess,
}: StatoLeadCardProps) {
  const [noteStato, setNoteStato] = React.useState(card?.appuntiChiamataSales ?? "-");
  const [dataRicontatto, setDataRicontatto] = React.useState(
    card?.dataPerRicercaFutura ?? "-"
  );

  React.useEffect(() => {
    if (!card) return;
    setNoteStato(card.appuntiChiamataSales);
    setDataRicontatto(card.dataPerRicercaFutura);
  }, [card]);

  if (!card) {
    return null;
  }

  let content: ReactNode = null;

  switch (card.stage) {
    case "hot_in_attesa_di_primo_contatto":
      content = (
        <FieldSet>
          <ChoiceFieldSet
            title="Tentativi di chiamata"
            selected={card.salesColdCallFollowup}
            options={lookupOptionsByField.sales_cold_call_followup ?? []}
            onValueChange={(next) => {
              void onPatchProcess?.(card.id, {
                sales_cold_call_followup: next || null,
              });
            }}
          />
        </FieldSet>
      );
      break;

    case "hot_contatto_avvenuto":
      content = (
        <StageRules
          lines={[
            "1. Può parlare ora -> HOT - Call attivazione fatta",
            "2. Chiede appuntamento -> HOT - Call attivazione prenotata",
            "3. Chiede callback -> HOT - Callback programmato",
            "4. Decisione rimandata -> HOT - Decisione rimandata",
            "5. Data futura -> COLD - Ricerca futura",
            "6. Rifiuto/impossibilità -> LOST",
          ]}
        />
      );
      break;

    case "hot_callback_programmato":
      content = (
        <StageRules
          lines={[
            "Se non risponde -> HOT - No-show",
            "Se risponde -> HOT - Call attivazione fatta",
          ]}
        />
      );
      break;

    case "hot_call_attivazione_prenotata":
      if (hasValue(card.dataCallPrenotata)) {
        content = (
          <Field>
            <FieldLabel htmlFor="data-call-prenotata">
              Data chiamata prenotata
            </FieldLabel>
            <DatePicker value={renderValue(card.dataCallPrenotata)} disabled />
          </Field>
        );
      }
      break;

    case "hot_no_show":
      content = (
        <FieldSet>
          <ChoiceFieldSet
            title="Tentativi di chiamata"
            selected={card.salesNoShowFollowup}
            options={lookupOptionsByField.sales_no_show_followup ?? []}
            onValueChange={(next) => {
              void onPatchProcess?.(card.id, {
                sales_no_show_followup: next || null,
              });
            }}
          />
        </FieldSet>
      );
      break;

    case "lost":
      content = (
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
            <FieldLabel htmlFor="note-lost">Note</FieldLabel>
            <Textarea
              id="note-lost"
              value={noteStato === "-" ? "" : noteStato}
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
      content = (
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
            <FieldLabel htmlFor="note-oot">Note</FieldLabel>
            <Textarea
              id="note-oot"
              value={noteStato === "-" ? "" : noteStato}
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

    case "cold_ricerca_futura":
      content = (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="data-ricontatto">Data ricontatto</FieldLabel>
            <DatePicker
              value={dataRicontatto === "-" ? "" : dataRicontatto}
              onValueChange={(next) => {
                setDataRicontatto(next);
                void onPatchProcess?.(card.id, {
                  data_per_ricerca_futura: next ? toIsoDate(next) : null,
                });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="note-cold">Note</FieldLabel>
            <Textarea
              id="note-cold"
              value={noteStato === "-" ? "" : noteStato}
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
  }

  const stageOptions = lookupOptionsByField.stato_sales ?? [];
  const groupedStageOptions = stageOptions.reduce<
    Record<string, LookupOption[]>
  >((acc, option) => {
    const group = getStageGroupKey(option.valueKey);
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {});
  const groupOrder = [
    "warm",
    "hot",
    "cold",
    "won",
    "lost",
    "out_of_target",
    "other",
  ].filter((group) => (groupedStageOptions[group] ?? []).length > 0);

  if (!showStageField && !content) {
    return null;
  }

  const resolvedTitle = title ?? (showStageField ? "Stato Lead" : getContextualCardTitle(card.stage));

  return (
    <CrmDetailCard title={resolvedTitle} titleAction={titleAction}>
      <FieldGroup>
        {showStageField ? (
          <Field>
            <FieldLabel htmlFor="stato-lead-stage">Stato</FieldLabel>
            <Select
              value={card.stage}
              onValueChange={(nextStage) => {
                if (!nextStage || nextStage === card.stage) return;
                void onChangeStage?.(card.id, nextStage);
              }}
            >
              <SelectTrigger id="stato-lead-stage" className="w-full">
                <SelectValue placeholder="Seleziona stato" />
              </SelectTrigger>
              <SelectContent>
                {groupOrder.map((groupKey, groupIndex) => (
                  <React.Fragment key={groupKey}>
                    <SelectGroup>
                      <SelectLabel>{getStageGroupLabel(groupKey)}</SelectLabel>
                      {groupedStageOptions[groupKey].map((option) => (
                        <SelectItem
                          key={option.valueKey}
                          value={option.valueKey}
                          className={getSelectItemClassName(option.color)}
                        >
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {groupIndex < groupOrder.length - 1 ? (
                      <SelectSeparator />
                    ) : null}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {content}
      </FieldGroup>
    </CrmDetailCard>
  );
}
