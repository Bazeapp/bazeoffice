import * as React from "react"
import { toast } from "sonner"

import { useWorkerSectionDraft } from "@/hooks/use-worker-section-draft"
import { invokeWorkerAvailability } from "@/lib/availability-functions"
import { updateRecord } from "@/lib/record-crud"
import {
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_HOUR_LABELS,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  buildAvailabilityPatchFromMatrix,
  getAvailabilityMatrixKey,
  isAvailabilityHourActive,
  parseAvailabilityPayload,
  readAvailabilitySlots,
} from "../lib/availability-utils"
import { asLavoratoreRecord } from "../lib/base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"
import {
  type WorkerAvailabilityDraft,
  type WorkerAvailabilityStatusDraft,
  buildAvailabilityDraft,
  buildAvailabilityStatusDraft,
} from "../lib/worker-editor-draft-builders"
import { formatEditorError } from "../lib/worker-editor-utils"

export type UseWorkerAvailabilityEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useWorkerAvailabilityEditor({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  applyUpdatedWorkerRow,
  setError,
}: UseWorkerAvailabilityEditorParams) {
  const [isEditingAvailabilityStatus, setIsEditingAvailabilityStatus] = React.useState(false)
  const [isEditingAvailability, setIsEditingAvailability] = React.useState(false)
  const [updatingAvailability, setUpdatingAvailability] = React.useState(false)
  const [updatingAvailabilityStatus, setUpdatingAvailabilityStatus] = React.useState(false)
  // Always-edit boards (Gate 2) never flip isEditingAvailability; protect the
  // draft from server resync only after the user actually edits the matrix so
  // the initial list→scheda enrichment can still land.
  const [availabilityDraftDirty, setAvailabilityDraftDirty] = React.useState(false)

  React.useEffect(() => {
    setAvailabilityDraftDirty(false)
  }, [selectedWorkerId])

  const availabilityPayload = React.useMemo(
    () => parseAvailabilityPayload(selectedWorkerRow?.availability_final_json),
    [selectedWorkerRow]
  )

  const availabilityReadOnlyRows = React.useMemo(
    () =>
      AVAILABILITY_DAY_LABELS
        ? Object.keys(AVAILABILITY_DAY_LABELS).slice(0, 6).map((day) => {
            const typedDay = day as keyof typeof AVAILABILITY_DAY_LABELS
            const slots = readAvailabilitySlots(availabilityPayload?.weekly, typedDay)
            return {
              day: AVAILABILITY_DAY_LABELS[typedDay],
              activeByHour: AVAILABILITY_HOUR_LABELS.map((hourLabel) =>
                isAvailabilityHourActive(slots, hourLabel)
              ),
            }
          })
        : [],
    [availabilityPayload]
  )

  const { draft: availabilityStatusDraft, setDraft: setAvailabilityStatusDraft } =
    useWorkerSectionDraft<WorkerAvailabilityStatusDraft>({
      selectedWorkerId,
      selectedWorkerRow,
      activePatchesRef,
      isEditing: isEditingAvailabilityStatus,
      setIsEditing: setIsEditingAvailabilityStatus,
      buildDraft: buildAvailabilityStatusDraft,
    })
  const { draft: availabilityDraft, setDraft: setAvailabilityDraft } =
    useWorkerSectionDraft<WorkerAvailabilityDraft>({
      selectedWorkerId,
      selectedWorkerRow,
      activePatchesRef,
      isEditing: isEditingAvailability || availabilityDraftDirty,
      setIsEditing: setIsEditingAvailability,
      buildDraft: (row) => buildAvailabilityDraft(row, availabilityPayload),
      resyncDeps: [availabilityPayload],
    })

  const saveWorkerAvailability = React.useCallback(async () => {
    if (!selectedWorkerId) return

    const patch = {
      disponibilita: availabilityStatusDraft.disponibilita.trim() || null,
      data_ritorno_disponibilita: availabilityStatusDraft.data_ritorno_disponibilita || null,
      disponibilita_nel_giorno:
        availabilityDraft.disponibilita_nel_giorno.length > 0
          ? availabilityDraft.disponibilita_nel_giorno
          : null,
      vincoli_orari_disponibilita:
        availabilityDraft.vincoli_orari_disponibilita.trim() || null,
      ...buildAvailabilityPatchFromMatrix(availabilityDraft.matrix, availabilityPayload),
    } as Partial<LavoratoreRecord> & Record<string, unknown>

    setUpdatingAvailability(true)
    setUpdatingAvailabilityStatus(true)
    try {
      const result = await updateRecord("lavoratori", selectedWorkerId, patch)
      const nextRow = asLavoratoreRecord(result.row)
      applyUpdatedWorkerRow(nextRow)
      await invokeWorkerAvailability(selectedWorkerId)
      setAvailabilityDraftDirty(false)
      toast.success("Disponibilita lavoratore salvata")
    } catch (caughtError) {
      const message = formatEditorError("Errore salvando disponibilita", caughtError)
      setError(message)
      toast.error(message)
      throw caughtError
    } finally {
      setUpdatingAvailability(false)
      setUpdatingAvailabilityStatus(false)
    }
  }, [
    applyUpdatedWorkerRow,
    availabilityDraft,
    availabilityPayload,
    availabilityStatusDraft,
    selectedWorkerId,
    setError,
  ])

  const patchWorkerAvailabilityStatus = React.useCallback(
    async (patch: Pick<Partial<LavoratoreRecord>, "disponibilita" | "data_ritorno_disponibilita">) => {
      if (!selectedWorkerId) return

      setUpdatingAvailabilityStatus(true)
      try {
        const result = await updateRecord("lavoratori", selectedWorkerId, patch)
        const nextRow = asLavoratoreRecord(result.row)
        applyUpdatedWorkerRow(nextRow)
        await invokeWorkerAvailability(selectedWorkerId)
      } catch (caughtError) {
        const message = formatEditorError("Errore salvando stato disponibilita", caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      } finally {
        setUpdatingAvailabilityStatus(false)
      }
    },
    [applyUpdatedWorkerRow, selectedWorkerId, setError]
  )

  const handleAvailabilityMatrixChange = React.useCallback(
    (
      dayField: AvailabilityEditDayField,
      bandField: AvailabilityEditBandField,
      checked: boolean
    ) => {
      const key = getAvailabilityMatrixKey(dayField, bandField)
      setAvailabilityDraftDirty(true)
      setAvailabilityDraft((current) => ({
        ...current,
        matrix: {
          ...current.matrix,
          [key]: checked,
        },
      }))
    },
    [setAvailabilityDraft]
  )

  return {
    availabilityPayload,
    availabilityReadOnlyRows,
    isEditingAvailabilityStatus,
    setIsEditingAvailabilityStatus,
    isEditingAvailability,
    setIsEditingAvailability,
    updatingAvailability,
    updatingAvailabilityStatus,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityStatusDraft,
    setAvailabilityStatusDraft,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
  }
}
