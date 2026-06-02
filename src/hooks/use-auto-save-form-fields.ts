import * as React from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

/**
 * FASE 5 BIS — thin wrapper di autosave sopra react-hook-form.
 *
 * Risolve la classe di bug "l'handler dimentica di salvare": invece di
 * scrivere a mano `onChange={(v) => { setDraft(v); patch(v) }}` (dove è facile
 * scordare il `patch`), il form è la source of truth e questo hook salva
 * AUTOMATICAMENTE i campi che cambiano. Impossibile dimenticare il save.
 *
 * Cosa fa:
 * - osserva i cambi di valore del form (solo modifiche utente, non reset/echo);
 * - **dirty-tracking**: non salva valori invariati rispetto all'ultimo committato;
 * - **coalescing/debounce**: accorpa i cambi entro `debounceMs` in un'unica patch
 *   (i Field components fanno già il debounce per-tipo, qui basta coalescere);
 * - **guard pausa**: se `isPaused()` è true (es. finestra echo realtime / utente
 *   sta editando) rimanda il save invece di clobberare;
 * - **errore visibile**: `toast.error` sul fallimento (FASE 4 TER);
 * - su `reset()` (cambio record o resync realtime) ri-sincronizza lo snapshot
 *   committato senza salvare.
 *
 * I Field components context-aware (FieldInput/FieldSelect/…) scrivono nel form
 * via RHF; questo hook è agganciato una volta a livello di <Form> e pensa al save.
 */

type UseAutoSaveFormFieldsOptions<T extends FieldValues> = {
  form: UseFormReturn<T>;
  /** Persiste la patch dei soli campi cambiati. Deve restituire una Promise. */
  onSave: (patch: Partial<T>) => Promise<void> | void;
  /**
   * Se ritorna true il save viene rimandato (riprovato al prossimo tick).
   * Usato per la finestra echo realtime / "utente sta editando".
   */
  isPaused?: () => boolean;
  /** Finestra di coalescing dei cambi (default 0: i Field debounciano già). */
  debounceMs?: number;
  /** Mappa l'errore in un messaggio per il toast. */
  errorMessage?: (error: unknown) => string;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  // Array / oggetti (es. multiselect): confronto strutturale stabile.
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function defaultErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Salvataggio non riuscito";
}

export function useAutoSaveFormFields<T extends FieldValues>({
  form,
  onSave,
  isPaused,
  debounceMs = 0,
  errorMessage,
}: UseAutoSaveFormFieldsOptions<T>) {
  const onSaveRef = React.useRef(onSave);
  const isPausedRef = React.useRef(isPaused);
  const errorMessageRef = React.useRef(errorMessage);
  React.useEffect(() => {
    onSaveRef.current = onSave;
    isPausedRef.current = isPaused;
    errorMessageRef.current = errorMessage;
  });

  // Ultimo set di valori "salvati" (per dirty-tracking) e patch in attesa.
  const committedRef = React.useRef<Record<string, unknown>>({});
  const pendingRef = React.useRef<Record<string, unknown>>({});
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!initializedRef.current) {
      committedRef.current = { ...form.getValues() };
      initializedRef.current = true;
    }

    const flush = () => {
      timerRef.current = null;
      // Rimanda finché siamo in pausa (echo realtime / editing in corso).
      if (isPausedRef.current?.()) {
        timerRef.current = setTimeout(flush, debounceMs || 150);
        return;
      }
      const patch = pendingRef.current;
      const keys = Object.keys(patch);
      if (keys.length === 0) return;
      pendingRef.current = {};

      void Promise.resolve(onSaveRef.current(patch as Partial<T>))
        .then(() => {
          // Marca i campi come committati solo se ancora invariati nel form.
          for (const key of keys) {
            committedRef.current[key] = patch[key];
          }
        })
        .catch((error: unknown) => {
          const resolve = errorMessageRef.current ?? defaultErrorMessage;
          toast.error(resolve(error));
        });
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, debounceMs);
    };

    const subscription = form.watch((values, { name, type }) => {
      // reset()/programmatici (cambio record, resync realtime): ri-sincronizza
      // lo snapshot committato e NON salvare.
      if (type !== "change" || !name) {
        committedRef.current = { ...(values as Record<string, unknown>) };
        pendingRef.current = {};
        return;
      }
      const nextValue = (values as Record<string, unknown>)[name];
      // Dirty-tracking: ignora se invariato rispetto all'ultimo committato.
      if (valuesEqual(nextValue, committedRef.current[name])) {
        delete pendingRef.current[name];
        return;
      }
      pendingRef.current[name] = nextValue;
      schedule();
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, debounceMs]);
}
