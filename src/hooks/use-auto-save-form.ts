import * as React from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { useAutoSaveFormFields } from "@/hooks/use-auto-save-form-fields";

/**
 * FASE 5 BIS — hook unico per un pannello con autosave.
 *
 * Impacchetta le 3 cose che ogni pannello dovrebbe fare (e che è facile fare
 * male se ripetute a mano):
 *  1. `useForm` con i valori server come defaults;
 *  2. **resync realtime senza clobber**: `form.reset(defaults, { keepDirtyValues })`
 *     keyed sulla firma dei dati → i campi puliti si aggiornano sui cambi server
 *     (anche realtime stesso record), quelli che l'utente sta editando NO;
 *  3. `useAutoSaveFormFields` → persiste i cambi (debounce + toast + dirty-track).
 *
 * Il pezzo (2) è la parte delicata (è quella che storicamente clobberava gli
 * edit sui refetch realtime): viverla in un solo posto la rende corretta ovunque.
 *
 * Uso:
 *   const form = useAutoSaveForm({
 *     defaults: buildDefaults(record),         // ricostruito ad ogni render
 *     onSave: (patch) => persist(record.id, patch),
 *   })
 *   return <Form {...form}> <FieldInput name="..." /> ... </Form>
 */
export function useAutoSaveForm<T extends FieldValues>({
  defaults,
  onSave,
  isPaused,
  debounceMs,
  errorMessage,
}: {
  /** Valori server correnti del record (ricostruiti ad ogni render). */
  defaults: T;
  onSave: (patch: Partial<T>) => Promise<void> | void;
  isPaused?: () => boolean;
  debounceMs?: number;
  errorMessage?: (error: unknown) => string;
}): UseFormReturn<T> {
  const form = useForm<T>({ defaultValues: defaults as DefaultValues<T> });

  // Resync sui cambi server mantenendo gli edit in corso. Keyed sulla firma
  // dei valori così non resetta ad ogni render (defaults è un nuovo oggetto).
  const signature = JSON.stringify(defaults);
  React.useEffect(() => {
    form.reset(defaults as DefaultValues<T>, { keepDirtyValues: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useAutoSaveFormFields({ form, onSave, isPaused, debounceMs, errorMessage });

  return form;
}
