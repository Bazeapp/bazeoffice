import * as React from "react"
import { toast } from "sonner"

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

  const [availabilityStatusDraft, setAvailabilityStatusDraft] =
    React.useState<WorkerAvailabilityStatusDraft>(() =>
      buildAvailabilityStatusDraft(selectedWorkerRow)
    )
  const [availabilityDraft, setAvailabilityDraft] = React.useState<WorkerAvailabilityDraft>(() =>
    buildAvailabilityDraft(selectedWorkerRow, availabilityPayload)
  )

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditingAvailability) {
      setAvailabilityDraft(buildAvailabilityDraft(selectedWorkerRow, availabilityPayload))
    }
    if (!isEditingAvailabilityStatus) {
      setAvailabilityStatusDraft(buildAvailabilityStatusDraft(selectedWorkerRow))
    }
  }, [
    activePatchesRef,
    availabilityPayload,
    isEditingAvailability,
    isEditingAvailabilityStatus,
    selectedWorkerRow,
  ])

  React.useEffect(() => {
    setIsEditingAvailabilityStatus(false)
    setIsEditingAvailability(false)
  }, [selectedWorkerId])

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
    async (
      dayField: AvailabilityEditDayField,
      bandField: AvailabilityEditBandField,
      checked: boolean
    ) => {
      const key = getAvailabilityMatrixKey(dayField, bandField)
      const nextMatrix = {
        ...availabilityDraft.matrix,
        [key]: checked,
      }

      setAvailabilityDraft((current) => ({
        ...current,
        matrix: nextMatrix,
      }))
    },
    [availabilityDraft.matrix]
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
