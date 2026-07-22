import * as React from "react";

import type { LavoratoreListItem } from "../components/lavoratore-card";
import { asString } from "../lib/base-utils";
import { PROVINCIA_DROPDOWN_OPTIONS } from "@/lib/province-italiane";
import { normalizeWorkerStatus } from "../lib/status-utils";
import type { LavoratoreRecord } from "../types/lavoratore";

/** Gate 1 list-panel filter state — must be wired into `useLavoratoriData`. */
export function useGate1ListFilters() {
  const [gateProvinciaFilter, setGateProvinciaFilter] = React.useState("all");
  const [gateFollowupFilter, setGateFollowupFilter] = React.useState("all");

  return {
    gateProvinciaFilter,
    setGateProvinciaFilter,
    gateFollowupFilter,
    setGateFollowupFilter,
  };
}

type UseGate1ListDerivedParams = {
  workerStatus: GateViewPropsWorkerStatus;
  workers: LavoratoreListItem[];
  workerRows: LavoratoreRecord[];
  lookupOptionsByDomain: Map<string, Array<{ label: string; value: string }>>;
  selectedWorkerId: string | null;
  setSelectedWorkerId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedWorker: LavoratoreListItem | null;
  selectedWorkerRow: LavoratoreRecord | null;
  statusChangeRetainedWorkerId: string | null;
};

type GateViewPropsWorkerStatus =
  | string
  | string[]
  | readonly string[];

/** Derived list data and worker-selection rules for the Gate 1 sidebar. */
export function useGate1ListDerived({
  workerStatus,
  workers,
  workerRows,
  lookupOptionsByDomain,
  selectedWorkerId,
  setSelectedWorkerId,
  selectedWorker,
  selectedWorkerRow,
  statusChangeRetainedWorkerId,
}: UseGate1ListDerivedParams) {
  const baseGateWorkers = React.useMemo(() => {
    const allowedStatuses = new Set(
      (Array.isArray(workerStatus) ? workerStatus : [workerStatus])
        .map((status) => normalizeWorkerStatus(status))
        .filter(Boolean),
    );
    const matchingIds = new Set(
      workerRows
        .filter((row) =>
          allowedStatuses.has(normalizeWorkerStatus(row.stato_lavoratore)),
        )
        .map((row) => row.id),
    );

    return workers.filter((worker) => matchingIds.has(worker.id));
  }, [workerStatus, workerRows, workers]);

  const workerRowsById = React.useMemo(() => {
    const rowsById = new Map<string, LavoratoreRecord>();
    for (const row of workerRows) {
      rowsById.set(row.id, row);
    }
    return rowsById;
  }, [workerRows]);

  const gateProvinciaOptions = React.useMemo(
    () => PROVINCIA_DROPDOWN_OPTIONS,
    [],
  );

  const followupValueToLabel = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of lookupOptionsByDomain.get(
      "lavoratori.followup_chiamata_idoneita",
    ) ?? []) {
      map.set(option.value, option.label);
      map.set(option.label, option.label);
    }
    return map;
  }, [lookupOptionsByDomain]);

  const gateFollowupOptions = React.useMemo(() => {
    const optionLabels = (
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? []
    ).map((option) => option.label);
    const rowLabels = baseGateWorkers
      .map((worker) => {
        const raw = asString(
          workerRowsById.get(worker.id)?.followup_chiamata_idoneita,
        );
        return followupValueToLabel.get(raw) ?? raw;
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...optionLabels, ...rowLabels]));
  }, [
    baseGateWorkers,
    followupValueToLabel,
    lookupOptionsByDomain,
    workerRowsById,
  ]);

  const gateWorkers = React.useMemo(() => baseGateWorkers, [baseGateWorkers]);

  React.useEffect(() => {
    if (!selectedWorkerId) {
      if (gateWorkers.length > 0) {
        setSelectedWorkerId(gateWorkers[0].id);
      }
      return;
    }

    if (
      statusChangeRetainedWorkerId === selectedWorkerId &&
      selectedWorker &&
      selectedWorkerRow
    ) {
      return;
    }

    if (!gateWorkers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(gateWorkers[0]?.id ?? null);
    }
  }, [
    gateWorkers,
    selectedWorker,
    selectedWorkerId,
    selectedWorkerRow,
    setSelectedWorkerId,
    statusChangeRetainedWorkerId,
  ]);

  return {
    baseGateWorkers,
    gateWorkers,
    workerRowsById,
    gateProvinciaOptions,
    gateFollowupOptions,
  };
}
