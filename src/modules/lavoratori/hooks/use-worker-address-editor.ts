import * as React from "react"
import { toast } from "sonner"

import { createRecord, updateRecord } from "@/lib/record-crud"
import { asString, readArrayStrings } from "../lib/base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"
import { type PatchLoadingKey, type WorkerAddressDraft, buildAddressDraft } from "./draft-builders"
import { formatEditorError } from "./editor-utils"

export type UseWorkerAddressEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  selectedWorkerAddress: Record<string, unknown> | null
  activePatchesRef: React.MutableRefObject<number>
  patchSelectedWorkerField: (
    field: keyof LavoratoreRecord,
    value: unknown
  ) => Promise<void>
  applyUpdatedWorkerAddress: (row: Record<string, unknown>) => void
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setPatchLoading: (key: PatchLoadingKey, value: boolean) => void
}

export function useWorkerAddressEditor({
  selectedWorkerId,
  selectedWorkerRow,
  selectedWorkerAddress,
  activePatchesRef,
  patchSelectedWorkerField,
  applyUpdatedWorkerAddress,
  setError,
  setPatchLoading,
}: UseWorkerAddressEditorParams) {
  const [isEditingAddress, setIsEditingAddress] = React.useState(false)
  const [addressDraft, setAddressDraft] = React.useState<WorkerAddressDraft>(() =>
    buildAddressDraft(selectedWorkerRow, selectedWorkerAddress)
  )
  // Serialize concurrent address-create calls per worker so that field
  // patches firing before the first INSERT returns don't each create a
  // new `indirizzi` row.
  const pendingAddressCreateRef = React.useRef<
    Map<string, Promise<Record<string, unknown> | null>>
  >(new Map())

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditingAddress) {
      setAddressDraft(buildAddressDraft(selectedWorkerRow, selectedWorkerAddress))
    }
  }, [activePatchesRef, isEditingAddress, selectedWorkerAddress, selectedWorkerRow])

  React.useEffect(() => {
    setIsEditingAddress(false)
  }, [selectedWorkerId])

  const applyAddressPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!selectedWorkerId) return null
      activePatchesRef.current++
      setPatchLoading("nonQualificato", true)
      try {
        const addressId = asString(selectedWorkerAddress?.id)
        if (addressId) {
          const result = await updateRecord("indirizzi", addressId, patch)
          const nextAddress = result.row as Record<string, unknown>
          applyUpdatedWorkerAddress(nextAddress)
          return nextAddress
        }

        const pending = pendingAddressCreateRef.current.get(selectedWorkerId)
        if (pending) {
          const existing = await pending
          const existingId = asString(existing?.id)
          if (existingId) {
            const result = await updateRecord("indirizzi", existingId, patch)
            const nextAddress = result.row as Record<string, unknown>
            applyUpdatedWorkerAddress(nextAddress)
            return nextAddress
          }
        }

        const createPromise = createRecord("indirizzi", {
          entita_tabella: "lavoratori",
          entita_id: selectedWorkerId,
          tipo_indirizzo: "residenza",
          ...patch,
        }).then((result) => result.row as Record<string, unknown>)

        pendingAddressCreateRef.current.set(selectedWorkerId, createPromise)
        let nextAddress: Record<string, unknown> | null = null
        try {
          nextAddress = await createPromise
        } finally {
          if (pendingAddressCreateRef.current.get(selectedWorkerId) === createPromise) {
            pendingAddressCreateRef.current.delete(selectedWorkerId)
          }
        }
        if (nextAddress) {
          applyUpdatedWorkerAddress(nextAddress)
        }
        return nextAddress
      } catch (caughtError) {
        const addressMessage = formatEditorError("Errore aggiornando indirizzo", caughtError)
        setError(addressMessage)
        toast.error(addressMessage)
        throw caughtError
      } finally {
        activePatchesRef.current--
        setPatchLoading("nonQualificato", false)
      }
    },
    [
      activePatchesRef,
      applyUpdatedWorkerAddress,
      selectedWorkerAddress,
      selectedWorkerId,
      setError,
      setPatchLoading,
    ]
  )

  const patchWorkerAddressField = React.useCallback(
    async (
      field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono" | "note",
      value: string | null
    ) => {
      const dbField = field === "provincia" ? "provincia_sigla" : field
      await applyAddressPatch({ [dbField]: value })
    },
    [applyAddressPatch]
  )

  const commitAddressField = React.useCallback(
    async (
      field:
        | "via"
        | "civico"
        | "cap"
        | "citta"
        | "provincia"
        | "citofono"
        | "come_ti_sposti",
      overrideValue?: string
    ) => {
      if (field === "come_ti_sposti") {
        const currentValue = readArrayStrings(selectedWorkerRow?.come_ti_sposti)
        const nextValue = addressDraft.come_ti_sposti
        if (JSON.stringify(nextValue) === JSON.stringify(currentValue)) return
        await patchSelectedWorkerField(field, nextValue.length > 0 ? nextValue : null)
        return
      }

      const source = overrideValue ?? addressDraft[field]
      const nextValue = source.trim() || null
      await applyAddressPatch({ [field]: nextValue })
    },
    [addressDraft, applyAddressPatch, patchSelectedWorkerField, selectedWorkerRow]
  )

  return {
    isEditingAddress,
    setIsEditingAddress,
    addressDraft,
    setAddressDraft,
    applyAddressPatch,
    patchWorkerAddressField,
    commitAddressField,
  }
}
