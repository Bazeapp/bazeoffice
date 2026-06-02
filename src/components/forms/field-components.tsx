import * as React from "react";
import { useController } from "react-hook-form";

import { DebouncedInput, DebouncedTextarea } from "@/components/ui/debounced-input";

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
