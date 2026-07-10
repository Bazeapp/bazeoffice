import * as React from "react";

import {
  buildGateDraftSnapshot,
  EMPTY_GATE_DRAFT,
  mergeGateDraftFromSnapshot,
  type GateDraft,
} from "../lib/gate-draft";
import type { LavoratoreRecord } from "../types/lavoratore";

export type { GateDraft };

export function useGateDraft({
  selectedWorkerId,
  selectedWorkerRow,
}: {
  selectedWorkerId: string | null;
  selectedWorkerRow: LavoratoreRecord | null;
}) {
  const [gateDraft, setGateDraft] = React.useState<GateDraft>(EMPTY_GATE_DRAFT);
  const lastSyncedGateDraftRef = React.useRef<GateDraft | null>(null);

  React.useEffect(() => {
    lastSyncedGateDraftRef.current = null;
  }, [selectedWorkerId]);

  React.useEffect(() => {
    const nextSnapshot = buildGateDraftSnapshot(selectedWorkerRow);
    const previousSynced = lastSyncedGateDraftRef.current;
    lastSyncedGateDraftRef.current = nextSnapshot;
    if (previousSynced === null) {
      setGateDraft(nextSnapshot);
      return;
    }
    setGateDraft((current) =>
      mergeGateDraftFromSnapshot(current, previousSynced, nextSnapshot),
    );
  }, [selectedWorkerRow]);

  return {
    gateDraft,
    setGateDraft,
  };
}
