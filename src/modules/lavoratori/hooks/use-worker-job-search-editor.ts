import * as React from "react"

import type { LavoratoreRecord } from "../types/lavoratore"
import {
  type WorkerJobSearchDraft,
  buildJobSearchDraft,
} from "../lib/worker-editor-draft-builders"
import type { PatchWorkerField } from "../lib/worker-editor-patch-field"

export type UseWorkerJobSearchEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  patchWorkerField: PatchWorkerField
}

export function useWorkerJobSearchEditor({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  patchWorkerField,
}: UseWorkerJobSearchEditorParams) {
  const [isEditingJobSearch, setIsEditingJobSearch] = React.useState(false)
  const [updatingJobSearch, setUpdatingJobSearch] = React.useState(false)
  const [jobSearchDraft, setJobSearchDraft] = React.useState<WorkerJobSearchDraft>(() =>
    buildJobSearchDraft(selectedWorkerRow)
  )

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditingJobSearch) setJobSearchDraft(buildJobSearchDraft(selectedWorkerRow))
  }, [activePatchesRef, isEditingJobSearch, selectedWorkerRow])

  React.useEffect(() => {
    setIsEditingJobSearch(false)
  }, [selectedWorkerId])

  const patchJobSearchField = React.useCallback(
    async (
      field:
        | "tipo_lavoro_domestico"
        | "tipo_rapporto_lavorativo"
        | "check_lavori_accettabili"
        | "check_accetta_funzionamento_baze"
        | "check_accetta_lavori_con_trasferta"
        | "check_accetta_multipli_contratti"
        | "check_accetta_paga_9_euro_netti",
      value: unknown
    ) => {
      setUpdatingJobSearch(true)
      try {
        await patchWorkerField(field, value, {
          errorMessage: "Errore aggiornando ricerca lavoro",
        })
      } finally {
        setUpdatingJobSearch(false)
      }
    },
    [patchWorkerField]
  )

  return {
    isEditingJobSearch,
    setIsEditingJobSearch,
    updatingJobSearch,
    jobSearchDraft,
    setJobSearchDraft,
    patchJobSearchField,
  }
}
