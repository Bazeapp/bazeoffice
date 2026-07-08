import * as React from "react"

import type { LavoratoreRecord } from "../types/lavoratore"
import {
  type WorkerSkillsDraft,
  buildSkillsDraft,
} from "../lib/worker-editor-draft-builders"
import type { PatchWorkerField } from "../lib/worker-editor-patch-field"

export type UseWorkerSkillsEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  patchWorkerField: PatchWorkerField
}

export function useWorkerSkillsEditor({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  patchWorkerField,
}: UseWorkerSkillsEditorParams) {
  const [isEditingSkills, setIsEditingSkills] = React.useState(false)
  const [updatingSkills, setUpdatingSkills] = React.useState(false)
  const [skillsDraft, setSkillsDraft] = React.useState<WorkerSkillsDraft>(() =>
    buildSkillsDraft(selectedWorkerRow)
  )

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditingSkills) setSkillsDraft(buildSkillsDraft(selectedWorkerRow))
  }, [activePatchesRef, isEditingSkills, selectedWorkerRow])

  React.useEffect(() => {
    setIsEditingSkills(false)
  }, [selectedWorkerId])

  const patchSkillsField = React.useCallback(
    async (field: keyof WorkerSkillsDraft, value: string) => {
      setUpdatingSkills(true)
      try {
        await patchWorkerField(field, value.trim() || null, {
          errorMessage: "Errore aggiornando skill e competenze",
        })
      } finally {
        setUpdatingSkills(false)
      }
    },
    [patchWorkerField]
  )

  return {
    isEditingSkills,
    setIsEditingSkills,
    updatingSkills,
    skillsDraft,
    setSkillsDraft,
    patchSkillsField,
  }
}
