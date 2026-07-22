import * as React from "react";
import { useController } from "react-hook-form";
import { CheckIcon, XIcon } from "lucide-react";

import { DebouncedInput, DebouncedTextarea } from "@/components/ui/debounced-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DatePicker, type DatePickerProps } from "@/components/ui/date-picker";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * FASE 5 BIS — Field components context-aware.
 *
 * Si auto-agganciano al form via `useController` (context di react-hook-form):
 * NON ricevono `value`/`onChange`, solo `name`. Leggono/scrivono il campo nel
 * form; la persistenza la fa `useAutoSaveFormFields` agganciato al <Form>.
 * Impossibile dimenticare il save: non c'è un onChange da scrivere a mano.
 *
 * `FieldInput`/`FieldTextarea` riusano i collaudati `DebouncedInput`/
 * `DebouncedTextarea` (debounce + anti-focus-loss + resync da committedValue):
 * - `committedValue` = valore corrente nel form (resync su reset/cambio record);
 * - `onSave` = `field.onChange` → committa nel form → autosave persiste.
 */

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

type FieldInputProps = Omit<
  React.ComponentProps<typeof DebouncedInput>,
  "committedValue" | "onSave"
> & { name: string };

export function FieldInput({ name, ...props }: FieldInputProps) {
  const { field } = useController({ name });
  return (
    <DebouncedInput
      committedValue={toStringValue(field.value)}
      onSave={async (value) => field.onChange(value)}
      onBlur={field.onBlur}
      {...props}
    />
  );
}

type FieldTextareaProps = Omit<
  React.ComponentProps<typeof DebouncedTextarea>,
  "committedValue" | "onSave"
> & { name: string };

export function FieldTextarea({ name, ...props }: FieldTextareaProps) {
  const { field } = useController({ name });
  return (
    <DebouncedTextarea
      committedValue={toStringValue(field.value)}
      onSave={async (value) => field.onChange(value)}
      onBlur={field.onBlur}
      {...props}
    />
  );
}

// --- FieldSelect: select singolo (no debounce — la scelta è l'intent finale) ---
export type FieldSelectOption = {
  value: string;
  label: string;
  className?: string;
};

export function FieldSelect({
  name,
  options,
  placeholder,
  triggerClassName,
  triggerId,
}: {
  name: string;
  options: FieldSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  triggerId?: string;
}) {
  const { field } = useController({ name });
  return (
    <Select value={toStringValue(field.value)} onValueChange={field.onChange}>
      <SelectTrigger id={triggerId} className={triggerClassName ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={option.className}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- FieldChoice: radio group (no debounce). `className` per-opzione = colore
//     badge (il caller lo calcola; il componente resta disaccoppiato). ---
export type FieldChoiceOption = {
  value: string;
  label: React.ReactNode;
  className?: string;
};

export function FieldChoice({
  name,
  title,
  options,
}: {
  name: string;
  title?: string;
  options: FieldChoiceOption[];
}) {
  const { field } = useController({ name });
  if (options.length === 0) return null;
  return (
    <FieldSet>
      {title ? <FieldLegend variant="label">{title}</FieldLegend> : null}
      <RadioGroup
        value={toStringValue(field.value)}
        onValueChange={field.onChange}
        className="gap-2"
      >
        {options.map((option, index) => {
          const id = `field-choice-${name}-${option.value}-${index}`;
          return (
            <Field key={id} orientation="horizontal">
              <RadioGroupItem id={id} value={option.value} />
              <FieldLabel htmlFor={id} className="font-normal">
                {option.className ? (
                  <Badge variant="outline" className={option.className}>
                    {option.label}
                  </Badge>
                ) : (
                  option.label
                )}
              </FieldLabel>
            </Field>
          );
        })}
      </RadioGroup>
    </FieldSet>
  );
}

// --- FieldAcceptChoice: radio su lookup label (GateAcceptField semantics).
//     Il form memorizza option.label, non option.value. ---
export function FieldAcceptChoice({
  name,
  options,
  disabled = false,
}: {
  name: string;
  options: FieldChoiceOption[];
  disabled?: boolean;
}) {
  const { field } = useController({ name });
  if (options.length === 0) return null;

  return (
    <RadioGroup
      value={toStringValue(field.value)}
      onValueChange={field.onChange}
      className={disabled ? "gap-2 opacity-50" : "gap-2"}
      disabled={disabled}
    >
      {options.map((option, index) => {
        const id = `field-accept-${name}-${index}`;
        const labelText = typeof option.label === "string" ? option.label : "";
        return (
          <label key={id} className="flex items-center gap-2 text-sm">
            <RadioGroupItem id={id} value={labelText} />
            <span
              className={
                option.className
                  ? `inline-flex items-center gap-1 rounded-4xl border px-2.5 py-0.5 text-xs ${option.className}`
                  : "inline-flex items-center gap-1"
              }
            >
              {labelText === "Accetta" ? (
                <CheckIcon className="size-3.5" />
              ) : labelText === "Non accetta" ? (
                <XIcon className="size-3.5" />
              ) : null}
              {option.label}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

// --- FieldDatePicker: normalizza la data in ISO (yyyy-mm-dd) UNA volta qui,
//     così nessuna card ripete toIsoDate (propagazione). ---
function toIsoDate(value: string): string {
  const normalized = value.trim();
  const parts = normalized.split("/");
  if (parts.length !== 3) return normalized;
  const day = parts[0]?.padStart(2, "0");
  const month = parts[1]?.padStart(2, "0");
  const year = parts[2];
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

// --- FieldCheckbox: booleano (no debounce). ---
type FieldCheckboxProps = Omit<
  React.ComponentProps<typeof Checkbox>,
  "checked" | "onCheckedChange"
> & { name: string };

export function FieldCheckbox({ name, ...props }: FieldCheckboxProps) {
  const { field } = useController({ name });
  return (
    <Checkbox
      checked={Boolean(field.value)}
      onCheckedChange={(checked) => field.onChange(checked === true)}
      onBlur={field.onBlur}
      {...props}
    />
  );
}

type FieldDatePickerProps = Omit<DatePickerProps, "value" | "onValueChange"> & {
  name: string;
};

export function FieldDatePicker({ name, ...props }: FieldDatePickerProps) {
  const { field } = useController({ name });
  return (
    <DatePicker
      value={toStringValue(field.value)}
      onValueChange={(next) => field.onChange(next ? toIsoDate(next) : "")}
      {...props}
    />
  );
}

// --- FieldCombobox: multi-select con chip (no debounce). Lavora sulle LABEL
//     (come il pattern esistente); il form memorizza string[] di label. ---
export function FieldCombobox({
  name,
  id,
  options,
  emptyText = "Nessuna opzione trovata.",
}: {
  name: string;
  id?: string;
  options: { value: string; label: string }[];
  emptyText?: string;
}) {
  const { field } = useController({ name });
  const anchor = useComboboxAnchor();
  const labels = React.useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((option) => option.label?.trim())
            .filter((label): label is string => Boolean(label)),
        ),
      ),
    [options],
  );
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <Combobox
      multiple
      autoHighlight
      items={labels}
      value={value}
      onValueChange={(nextValues) =>
        field.onChange(
          Array.isArray(nextValues)
            ? nextValues.filter((item): item is string => typeof item === "string")
            : [],
        )
      }
    >
      <ComboboxChips ref={anchor} id={id} className="w-full">
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((entry) => (
                <ComboboxChip key={entry}>{entry}</ComboboxChip>
              ))}
              <ComboboxChipsInput />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList className="max-h-72">
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

// --- FieldMultiSelect: multi-select su lookup values (DB values, non label).
//     Stesso pattern di WorkerShiftPreferencesFields / gate1 disponibilita_nel_giorno.
export function FieldMultiSelect({
  name,
  options,
  placeholder = "Seleziona...",
  disabled,
  id,
}: {
  name: string;
  options: FieldSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { field } = useController({ name });
  const anchor = useComboboxAnchor();
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  const items = React.useMemo(
    () => options.map((option) => option.value),
    [options],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(nextValues) =>
        field.onChange(
          Array.isArray(nextValues)
            ? Array.from(new Set(nextValues.filter((item): item is string => typeof item === "string")))
            : [],
        )
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} id={id} className="w-full">
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((entry) => (
                <ComboboxChip key={entry}>
                  {getOptionLabel(options, entry)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder} />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
