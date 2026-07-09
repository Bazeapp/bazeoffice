import * as React from "react";

import { useGate1View } from "../../hooks/use-gate1-view";
import type { GateViewProps } from "../../types/gate1-view";
import { Gate1WorkerProvider } from "./gate1-worker-context";

export type Gate1ViewContextValue = ReturnType<typeof useGate1View>;

const Gate1ViewContext = React.createContext<Gate1ViewContextValue | null>(null);

export function Gate1ViewProvider({
  children,
  ...props
}: GateViewProps & { children: React.ReactNode }) {
  const value = useGate1View(props);

  return (
    <Gate1ViewContext.Provider value={value}>
      <Gate1WorkerProvider
        editor={value.gate1Editor}
        workerRow={value.selectedWorkerRow}
        retainSelectedWorkerAfterStatusChange={
          value.retainSelectedWorkerAfterStatusChange
        }
      >
        {children}
      </Gate1WorkerProvider>
    </Gate1ViewContext.Provider>
  );
}

export function useGate1ViewContext(): Gate1ViewContextValue {
  const context = React.useContext(Gate1ViewContext);
  if (!context) {
    throw new Error(
      "useGate1ViewContext must be used inside <Gate1ViewProvider>.",
    );
  }
  return context;
}
