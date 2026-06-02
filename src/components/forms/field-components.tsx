import * as React from "react";
import { useController } from "react-hook-form";

import { DebouncedInput, DebouncedTextarea } from "@/components/ui/debounced-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
