import * as React from "react"

import type { LavoratoreListItem } from "../components/lavoratore-card"
import { toListItem } from "../lib/base-utils"
import { isBlacklistValue } from "@/lib/lookup-utils"
import { toWorkerStatusFlags } from "../lib/status-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

type UseSelectedLavoratoreOptions = {
  initialSelectedWorkerId: string | null
  selectedWorkerId: string | null
  setSelectedWorkerId: React.Dispatch<React.SetStateAction<string | null>>
  selectedWorkerRow: LavoratoreRecord | null
  workers: LavoratoreListItem[]
}

export function useSelectedLavoratore({
  initialSelectedWorkerId,
  selectedWorkerId,
  setSelectedWorkerId,
  selectedWorkerRow,
  workers,
}: UseSelectedLavoratoreOptions) {
  const selectedWorker = React.useMemo(() => {
    const listWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? null
    if (listWorker) return listWorker
    if (!selectedWorkerRow) return null

    return toListItem(selectedWorkerRow, {
      isBlacklisted: isBlacklistValue(selectedWorkerRow.check_blacklist),
      statusFlags: toWorkerStatusFlags(selectedWorkerRow.stato_lavoratore),
    })
  }, [selectedWorkerId, selectedWorkerRow, workers])

  React.useEffect(() => {
    setSelectedWorkerId((previous) => {
      if (
        previous &&
        (previous === initialSelectedWorkerId ||
          workers.some((worker) => worker.id === previous))
      ) {
        return previous
      }
      return workers[0]?.id ?? null
    })
  }, [initialSelectedWorkerId, setSelectedWorkerId, workers])

  React.useEffect(() => {
    if (!initialSelectedWorkerId) return
    setSelectedWorkerId(initialSelectedWorkerId)
  }, [initialSelectedWorkerId, setSelectedWorkerId])

  return {
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
  }
}
