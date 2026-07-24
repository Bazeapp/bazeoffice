import * as React from "react";
import { CheckIcon, CircleHelpIcon, StarIcon, XIcon } from "lucide-react";

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
import { FieldLabel } from "@/components/ui/field";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizeDomesticRoleDbLabels,
  normalizeDomesticRoleLookupValues,
} from "../../lib/base-utils";
import {
  getLookupDisplayOption,
  getLookupOptionLabel,
  getTagClassName,
  resolveLookupColor,
} from "@/lib/lookup-utils";

/**
 * D2 — primitive di campo pure di Gate 1, estratte da gate1-view.
 *
 * Componenti presentazionali senza stato/Context: ricevono valore + onChange
 * via prop (li usano sia l'orchestratore sia le Gate*Card estratte). Tenute
 * insieme perché condividono badge/label/lookup helpers.
 */

export const EMPTY_SELECT_VALUE = "none";

export type LookupOptionLite = { label: string; value: string };

export function GateStepSection({
  step,
  isFirst = false,
  isLast = false,
  showStepper = true,
  reserveStepperSpace = false,
  info,
  children,
}: {
  step: number;
  isFirst?: boolean;
  isLast?: boolean;
  showStepper?: boolean;
  reserveStepperSpace?: boolean;
  info?: {
    title: React.ReactNode;
    content: React.ReactNode;
  };
  children: React.ReactNode;
}) {
  if (!showStepper) {
    if (reserveStepperSpace) {
      return (
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
          <div aria-hidden="true" className="relative">
            <div className="bg-border absolute top-[-1.5rem] bottom-[-1.5rem] left-1/2 w-px -translate-x-1/2" />
          </div>
          <div className="min-w-0 space-y-4">{children}</div>
        </div>
      );
    }

    return <div className="min-w-0 space-y-4">{children}</div>;
  }

  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
      <div className="relative">
        {isFirst ? null : (
          <div className="bg-border absolute top-[-1.5rem] left-1/2 h-8 w-px -translate-x-1/2" />
        )}
        {isLast ? null : (
          <div className="bg-border absolute top-4 bottom-[-1.5rem] left-1/2 w-px -translate-x-1/2" />
        )}
        <div className="bg-background text-foreground absolute top-0 left-1/2 z-10 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border text-sm font-semibold shadow-sm">
          {step}
        </div>
        {info ? (
          <HoverCard openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="bg-background text-muted-foreground absolute top-10 left-1/2 z-10 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm transition-colors hover:text-foreground"
                aria-label={`Informazioni step ${step}`}
                title={`Informazioni step ${step}`}
              >
                <CircleHelpIcon className="size-3.5" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="start"
              className="w-[26rem] space-y-3 p-4"
            >
              <p className="text-sm font-semibold">{info.title}</p>
              <div className="space-y-3 text-sm leading-6">{info.content}</div>
            </HoverCardContent>
          </HoverCard>
        ) : null}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

export function GateAllowedWorkField({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: LookupOptionLite[];
  onChange: (values: string[]) => void;
}) {
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
              <ComboboxChipsInput placeholder="Seleziona lavori" />
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

export function GateAcceptField({
  value,
  options,
  onChange,
  domain,
  lookupColorsByDomain,
  disabled = false,
}: {
  value: string;
  options: LookupOptionLite[];
  onChange: (value: string) => void;
  domain: string;
  lookupColorsByDomain: Map<string, string>;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className={disabled ? "gap-2 opacity-50" : "gap-2"}
      disabled={disabled}
    >
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={option.label} />
          <span
            className={`inline-flex items-center gap-1 rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
              resolveLookupColor(lookupColorsByDomain, domain, option.label) ??
                (option.label === "Accetta"
                  ? "green"
                  : option.label === "Non accetta"
                    ? "orange"
                    : null),
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
  );
}

export function GateLookupBadge({
  domain,
  value,
  options,
  lookupColorsByDomain,
}: {
  domain: string;
  value: string;
  options: LookupOptionLite[];
  lookupColorsByDomain: Map<string, string>;
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const displayLabel = activeOption?.label ?? value;

  if (!displayLabel) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
        resolveLookupColor(lookupColorsByDomain, domain, displayLabel),
      )}`}
    >
      {displayLabel}
    </span>
  );
}

export function GateFieldLabelWithInfo({
  label,
  helperLines,
}: {
  label: string;
  helperLines?: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {helperLines?.length ? (
        <HoverCard openDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex size-4 items-center justify-center rounded-full transition-colors hover:text-foreground"
              aria-label={`Informazioni su ${label}`}
              title={`Informazioni su ${label}`}
            >
              <CircleHelpIcon className="size-3.5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            className="w-64 space-y-1 p-3 text-sm leading-6"
          >
            {helperLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </HoverCardContent>
        </HoverCard>
      ) : null}
    </div>
  );
}

export function GateLevelSegmentedField({
  label,
  value,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  onChange,
  persistMode = "label",
  helperLines,
}: {
  label: string;
  value: string;
  options: LookupOptionLite[];
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  onChange: (value: string) => void;
  persistMode?: "label" | "value";
  helperLines?: string[];
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const normalizedValue =
    activeOption?.[persistMode === "value" ? "value" : "label"] ?? value;

  return (
    <div className="space-y-2">
      <GateFieldLabelWithInfo label={label} helperLines={helperLines} />
      {isEditing ? (
        <Select
          value={normalizedValue || EMPTY_SELECT_VALUE}
          onValueChange={(nextValue) =>
            onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
          }
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona livello" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={persistMode === "value" ? option.value : option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <GateLookupBadge
          domain={domain}
          value={value}
          options={options}
          lookupColorsByDomain={lookupColorsByDomain}
        />
      )}
    </div>
  );
}

export function GateLookupConfirmationField({
  label,
  value,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  onChange,
  persistMode = "label",
  placeholder = "Seleziona valore",
  helperLines,
}: {
  label: string;
  value: string;
  options: LookupOptionLite[];
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  onChange: (value: string) => void;
  persistMode?: "label" | "value";
  placeholder?: string;
  helperLines?: string[];
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const displayLabel = activeOption?.label ?? value;
  const selectValue = activeOption
    ? persistMode === "value"
      ? activeOption.value
      : activeOption.label
    : value || undefined;

  return (
    <div className="space-y-2">
      <GateFieldLabelWithInfo label={label} helperLines={helperLines} />
      {isEditing ? (
        <Select
          value={selectValue}
          onValueChange={(nextValue) => onChange(nextValue)}
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={persistMode === "value" ? option.value : option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex min-h-10 items-center rounded-lg border bg-surface px-3 py-2">
          {displayLabel ? (
            <span
              className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                resolveLookupColor(lookupColorsByDomain, domain, displayLabel),
              )}`}
            >
              {displayLabel}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      )}
    </div>
  );
}

export function GateStarRatingField({
  label,
  description,
  value,
  isEditing,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}) {
  const ratingScore = Number.parseInt(value, 10);
  const normalizedRatingScore = Number.isNaN(ratingScore) ? 0 : ratingScore;

  return (
    <div className="space-y-2">
      <p className="text-sm">{label}</p>
      <p className="text-muted-foreground text-sm italic">{description}</p>
      <div className="bg-background flex h-11 w-full items-center rounded-lg border px-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const score = index + 1;
            const active = normalizedRatingScore >= score;

            return (
              <button
                key={score}
                type="button"
                className={isEditing ? "disabled:opacity-50" : "cursor-default"}
                disabled={!isEditing}
                onClick={() =>
                  onChange(normalizedRatingScore === score ? "" : String(score))
                }
              >
                <StarIcon
                  className={
                    active
                      ? "size-4 fill-amber-400 text-amber-400"
                      : "text-muted-foreground/35 size-4"
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
