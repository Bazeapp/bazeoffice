import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { ZodType } from "zod";

import { useAutoSaveFormFields } from "@/hooks/use-auto-save-form-fields";

/**
 * FASE 5 BIS — hook unico per un pannello con autosave.
 *
 * Impacchetta le 3 cose che ogni pannello dovrebbe fare (e che è facile fare
 * male se ripetute a mano):
 *  1. `useForm` con i valori server come defaults;
 *  2. **resync realtime (remote wins)**: `form.reset(defaults)` keyed sulla firma
 *     dei dati → i valori server sostituiscono anche i draft RHF dirty, così gli
 *     open sheet vedono gli aggiornamenti peer. I DebouncedInput/Textarea
 *     proteggono solo il buffer mid-keystroke (debounce pending). Al cambio
 *     `resetKey`: stesso hard reset (niente leak tra record).
 *  3. `useAutoSaveFormFields` → persiste i cambi (debounce + toast + dirty-track).
 *
 * Il pezzo (2) è la parte delicata (è quella che storicamente clobberava gli
 * edit sui refetch realtime): viverla in un solo posto la rende corretta ovunque.
 *
 * Uso:
 *   const form = useAutoSaveForm({
 *     defaults: buildDefaults(record),         // ricostruito ad ogni render
 *     resetKey: record.id,                     // hard-reset al cambio record
 *     onSave: (patch) => persist(record.id, patch),
 *   })
 *   return <Form {...form}> <FieldInput name="..." /> ... </Form>
 */
export function useAutoSaveForm<T extends FieldValues>({
  defaults,
  onSave,
  schema,
  isPaused,
  debounceMs,
  errorMessage,
  resetKey,
}: {
  /** Valori server correnti del record (ricostruiti ad ogni render). */
  defaults: T;
  onSave: (patch: Partial<T>) => Promise<void> | void;
  /** Optional Zod schema — validates form values via react-hook-form resolver. */
  schema?: ZodType<T>;
  isPaused?: () => boolean;
  debounceMs?: number;
  errorMessage?: (error: unknown) => string;
  /**
   * Identità del record (es. worker id). Al cambio: hard reset (niente
   * keepDirtyValues) e scarta patch pending, così un edit non migra sul
   * record successivo. Stesso key + defaults diversi = resync realtime.
   */
  resetKey?: string | null;
}): UseFormReturn<T> {
  const form = useForm<T>({
    defaultValues: defaults as DefaultValues<T>,
    resolver: schema
      ? (zodResolver(schema as ZodType<T, FieldValues>) as Resolver<T>)
      : undefined,
  });

  // Resync sui cambi server. Remote wins (anche su campi dirty) così peer
  // updates atterrano sull'open sheet. Keyed sulla firma dei valori.
  const signature = JSON.stringify(defaults);
  React.useEffect(() => {
    form.reset(defaults as DefaultValues<T>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, resetKey]);

  useAutoSaveFormFields({
    form,
    onSave,
    isPaused,
    debounceMs,
    errorMessage,
    resetKey,
  });

  return form;
}
