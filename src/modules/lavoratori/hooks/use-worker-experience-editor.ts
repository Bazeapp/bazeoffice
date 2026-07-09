import * as React from "react"
import { toast } from "sonner"

import { useWorkerSectionDraft } from "@/hooks/use-worker-section-draft"
import { createRecord, deleteRecord, updateRecord } from "@/lib/record-crud"
import { asString, parseNumberValue } from "../lib/base-utils"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { LavoratoreRecord } from "../types/lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import {
  type WorkerExperienceDraft,
  buildExperienceDraft,
} from "../lib/worker-editor-draft-builders"
import { formatEditorError } from "../lib/worker-editor-utils"
import type { PatchWorkerField } from "../lib/worker-editor-patch-field"

export type UseWorkerExperienceEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  patchWorkerField: PatchWorkerField
  applyUpdatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  appendCreatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  removeWorkerExperience: (id: string) => void
  applyUpdatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  appendCreatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useWorkerExperienceEditor({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  patchWorkerField,
  applyUpdatedWorkerExperience,
  appendCreatedWorkerExperience,
  removeWorkerExperience,
  applyUpdatedWorkerReference,
  appendCreatedWorkerReference,
  setError,
}: UseWorkerExperienceEditorParams) {
  const [isEditingExperience, setIsEditingExperience] = React.useState(false)
  const [updatingExperience, setUpdatingExperience] = React.useState(false)
  const { draft: experienceDraft, setDraft: setExperienceDraft } =
    useWorkerSectionDraft<WorkerExperienceDraft>({
      selectedWorkerId,
      selectedWorkerRow,
      activePatchesRef,
      isEditing: isEditingExperience,
      setIsEditing: setIsEditingExperience,
      buildDraft: buildExperienceDraft,
    })

  const patchExperienceRecord = React.useCallback(
    async (experienceId: string, patch: Partial<EsperienzaLavoratoreRecord>) => {
      // NB: niente setUpdatingExperience qui. Questo è un autosave per-campo
      // (DebouncedTextarea/Input, debounce 300ms): updatingExperience diventa
      // `disabled` sugli input del pannello esperienze e disabilitare un input a
      // metà salvataggio gli toglie il focus mentre l'utente scrive (footgun
      // documentato in CLAUDE.md: "Do not add `disabled` to a DebouncedInput").
      // Il flag resta per le mutazioni strutturali (create/delete qui sotto).
      try {
        const result = await updateRecord("esperienze_lavoratori", experienceId, patch)
        applyUpdatedWorkerExperience(result.row as EsperienzaLavoratoreRecord)
      } catch (caughtError) {
        const message = formatEditorError("Errore aggiornando esperienza", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      }
    },
    [applyUpdatedWorkerExperience, setError]
  )

  const createExperienceRecord = React.useCallback(
    async (values: Partial<EsperienzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await createRecord(
          "esperienze_lavoratori",
          values as Record<string, unknown>
        )
        appendCreatedWorkerExperience(result.row as EsperienzaLavoratoreRecord)
      } catch (caughtError) {
        const message = formatEditorError("Errore creando esperienza", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [appendCreatedWorkerExperience, setError]
  )

  const deleteExperienceRecord = React.useCallback(
    async (experienceId: string) => {
      setUpdatingExperience(true)
      try {
        await deleteRecord("esperienze_lavoratori", experienceId)
        removeWorkerExperience(experienceId)
      } catch (caughtError) {
        const message = formatEditorError("Errore eliminando esperienza", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [removeWorkerExperience, setError]
  )

  const patchReferenceRecord = React.useCallback(
    async (referenceId: string, patch: Partial<ReferenzaLavoratoreRecord>) => {
      // Stesso motivo di patchExperienceRecord: autosave per-campo, niente flag
      // globale che disabiliterebbe (e sfocerebbe) gli input mentre si scrive.
      try {
        const result = await updateRecord("referenze_lavoratori", referenceId, patch)
        applyUpdatedWorkerReference(result.row as ReferenzaLavoratoreRecord)
      } catch (caughtError) {
        const message = formatEditorError("Errore aggiornando referenza", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      }
    },
    [applyUpdatedWorkerReference, setError]
  )

  const createReferenceRecord = React.useCallback(
    async (values: Partial<ReferenzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await createRecord(
          "referenze_lavoratori",
          values as Record<string, unknown>
        )
        appendCreatedWorkerReference(result.row as ReferenzaLavoratoreRecord)
      } catch (caughtError) {
        const message = formatEditorError("Errore creando referenza", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [appendCreatedWorkerReference, setError]
  )

  const commitExperienceField = React.useCallback(
    async (
      field:
        | "anni_esperienza_colf"
        | "anni_esperienza_badante"
        | "anni_esperienza_babysitter"
        | "situazione_lavorativa_attuale"
    ) => {
      if (field === "situazione_lavorativa_attuale") {
        const currentValue = asString(selectedWorkerRow?.[field])
        const nextValue = experienceDraft[field].trim()
        if (nextValue === currentValue) return
        setUpdatingExperience(true)
        try {
          await patchWorkerField(field, nextValue || null, {
            errorMessage: "Errore aggiornando esperienza lavorativa",
          })
        } finally {
          setUpdatingExperience(false)
        }
        return
      }

      const currentValue = parseNumberValue(selectedWorkerRow?.[field])
      const nextValue = parseNumberValue(experienceDraft[field])
      if (currentValue === nextValue) return
      setUpdatingExperience(true)
      try {
        await patchWorkerField(field, nextValue, {
          errorMessage: "Errore aggiornando esperienza lavorativa",
        })
      } finally {
        setUpdatingExperience(false)
      }
    },
    [experienceDraft, patchWorkerField, selectedWorkerRow]
  )

  return {
    isEditingExperience,
    setIsEditingExperience,
    updatingExperience,
    experienceDraft,
    setExperienceDraft,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
  }
}
