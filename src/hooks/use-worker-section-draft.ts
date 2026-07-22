import * as React from "react"

import type { LavoratoreRecord } from "@/modules/lavoratori/types/lavoratore"

type UseWorkerSectionDraftOptions<TDraft> = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
  buildDraft: (row: LavoratoreRecord | null) => TDraft
  resyncDeps?: readonly unknown[]
}

export function useWorkerSectionDraft<TDraft>({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  isEditing,
  setIsEditing,
  buildDraft,
  resyncDeps = [],
}: UseWorkerSectionDraftOptions<TDraft>) {
  const [draft, setDraft] = React.useState<TDraft>(() => buildDraft(selectedWorkerRow))

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditing) setDraft(buildDraft(selectedWorkerRow))
    // buildDraft is stable per hook callsite; resyncDeps covers extra inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatchesRef, isEditing, selectedWorkerRow, ...resyncDeps])

  React.useEffect(() => {
    setIsEditing(false)
  }, [selectedWorkerId, setIsEditing])

  return { draft, setDraft }
}
