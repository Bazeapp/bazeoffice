import * as React from "react";

import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";

/**
 * D2 — Context di dominio per lo sheet di dettaglio di Gate 1.
 *
 * gate1-view è un god-component compositivo: ~22 `Gate*Card` inline che oggi
 * ricevono valori e patch-fn via prop-drilling dall'orchestratore. Questo
 * Context wrappa l'intero output di `useSelectedWorkerEditor` (workerRow,
 * patch-fn, opzioni, flag edit) e lo espone ai sotto-componenti, così possono
 * essere:
 *   1. estratti in file separati (components/lavoratori/gate1/);
 *   2. avvolti in `React.memo` (leggono dal Context, niente prop che cambiano);
 *   3. resi auto-contenuti col proprio `useAutoSaveForm` (FASE 5 BIS).
 *
 * Senza Context lo split sarebbe prop-drilling puro; con Context ogni card
 * dichiara da sé cosa le serve via `useGate1WorkerEditor()`.
 */
type Gate1WorkerEditor = ReturnType<typeof useSelectedWorkerEditor>;

const Gate1WorkerContext = React.createContext<Gate1WorkerEditor | null>(null);

export function Gate1WorkerProvider({
  value,
  children,
}: {
  value: Gate1WorkerEditor;
  children: React.ReactNode;
}) {
  return (
    <Gate1WorkerContext.Provider value={value}>
      {children}
    </Gate1WorkerContext.Provider>
  );
}

export function useGate1WorkerEditor(): Gate1WorkerEditor {
  const ctx = React.useContext(Gate1WorkerContext);
  if (!ctx) {
    throw new Error(
      "useGate1WorkerEditor deve essere usato dentro <Gate1WorkerProvider> (D2).",
    );
  }
  return ctx;
}
