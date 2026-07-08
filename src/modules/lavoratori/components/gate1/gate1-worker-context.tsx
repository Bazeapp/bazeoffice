import * as React from "react";

import { useSelectedWorkerEditor } from "../../hooks/use-selected-worker-editor";
import type { LavoratoreRecord } from "../../types/lavoratore";

/**
 * D2 — Context di dominio per lo sheet di dettaglio di Gate 1.
 *
 * gate1-view è un god-component compositivo: ~22 `Gate*Card` inline che oggi
 * ricevono valori e patch-fn via prop-drilling dall'orchestratore. Questo
 * Context espone l'output di `useSelectedWorkerEditor` (`editor`: patch-fn,
 * draft, opzioni, flag edit) + la riga server `workerRow` (alcune card leggono
 * direttamente dalla riga, non dai draft per-sezione). Così i sotto-componenti
 * possono essere:
 *   1. estratti in file separati (components/lavoratori/gate1/);
 *   2. avvolti in `React.memo` (leggono dal Context, niente prop che cambiano);
 *   3. resi auto-contenuti col proprio `useAutoSaveForm` (FASE 5 BIS) dove serve.
 *
 * Le opzioni di lookup restano prop delle card (config statica memoizzata).
 */
type Gate1WorkerEditor = ReturnType<typeof useSelectedWorkerEditor>;

type Gate1WorkerContextValue = {
  editor: Gate1WorkerEditor;
  workerRow: LavoratoreRecord | null;
};

const Gate1WorkerContext = React.createContext<Gate1WorkerContextValue | null>(
  null,
);

export function Gate1WorkerProvider({
  editor,
  workerRow,
  children,
}: {
  editor: Gate1WorkerEditor;
  workerRow: LavoratoreRecord | null;
  children: React.ReactNode;
}) {
  const value = React.useMemo<Gate1WorkerContextValue>(
    () => ({ editor, workerRow }),
    [editor, workerRow],
  );
  return (
    <Gate1WorkerContext.Provider value={value}>
      {children}
    </Gate1WorkerContext.Provider>
  );
}

export function useGate1WorkerEditor(): Gate1WorkerContextValue {
  const ctx = React.useContext(Gate1WorkerContext);
  if (!ctx) {
    throw new Error(
      "useGate1WorkerEditor deve essere usato dentro <Gate1WorkerProvider> (D2).",
    );
  }
  return ctx;
}
