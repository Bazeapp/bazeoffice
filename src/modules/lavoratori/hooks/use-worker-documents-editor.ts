import * as React from "react"
import { toast } from "sonner"

import { createStripeConnectAccount } from "@/lib/stripe-connect-api"
import { asLavoratoreRecord, asString } from "../lib/base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"
import { type WorkerDocumentsDraft, buildDocumentsDraft } from "./draft-builders"
import { formatEditorError } from "./editor-utils"
import type { PatchWorkerField } from "./patch-worker-field"

export type UseWorkerDocumentsEditorParams = {
  selectedWorkerId: string | null
  selectedWorkerRow: LavoratoreRecord | null
  activePatchesRef: React.MutableRefObject<number>
  patchWorkerField: PatchWorkerField
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useWorkerDocumentsEditor({
  selectedWorkerId,
  selectedWorkerRow,
  activePatchesRef,
  patchWorkerField,
  applyUpdatedWorkerRow,
  setError,
}: UseWorkerDocumentsEditorParams) {
  const [isEditingDocuments, setIsEditingDocuments] = React.useState(false)
  const [updatingDocuments, setUpdatingDocuments] = React.useState(false)
  const [documentsDraft, setDocumentsDraft] = React.useState<WorkerDocumentsDraft>(() =>
    buildDocumentsDraft(selectedWorkerRow)
  )
  const resolvedIban = asString(selectedWorkerRow?.iban)

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    if (!isEditingDocuments) setDocumentsDraft(buildDocumentsDraft(selectedWorkerRow))
  }, [activePatchesRef, isEditingDocuments, selectedWorkerRow])

  React.useEffect(() => {
    setIsEditingDocuments(false)
  }, [selectedWorkerId])

  const patchDocumentField = React.useCallback(
    async (field: keyof WorkerDocumentsDraft, value: string | null) => {
      setUpdatingDocuments(true)
      try {
        if (field === "iban") {
          await patchWorkerField("iban", value, {
            errorMessage: "Errore aggiornando IBAN lavoratore",
          })
          return
        }

        await patchWorkerField(field, value, {
          errorMessage: "Errore aggiornando documenti",
        })
      } finally {
        setUpdatingDocuments(false)
      }
    },
    [patchWorkerField]
  )

  const commitDocumentField = React.useCallback(
    async (field: "data_scadenza_naspi" | "iban" | "id_stripe_account") => {
      const currentValue =
        field === "iban" ? resolvedIban : asString(selectedWorkerRow?.[field])
      const nextValue = documentsDraft[field]
      if (nextValue === currentValue) return

      await patchDocumentField(field, nextValue || null)
    },
    [documentsDraft, patchDocumentField, resolvedIban, selectedWorkerRow]
  )

  const generateStripeAccount = React.useCallback(async () => {
    if (!selectedWorkerId) return

    setUpdatingDocuments(true)
    try {
      const result = await createStripeConnectAccount(selectedWorkerId)
      if (result.row) {
        applyUpdatedWorkerRow(asLavoratoreRecord(result.row))
      }
      setDocumentsDraft((current) => ({
        ...current,
        id_stripe_account: result.id_stripe_account,
      }))
      toast.success(result.created ? "Account Stripe creato" : "Account Stripe gia presente")
      return result
    } catch (caughtError) {
      const message = formatEditorError("Errore creazione account Stripe", caughtError)
      setError(message)
      toast.error(message)
      throw caughtError
    } finally {
      setUpdatingDocuments(false)
    }
  }, [applyUpdatedWorkerRow, selectedWorkerId, setError])

  return {
    isEditingDocuments,
    setIsEditingDocuments,
    updatingDocuments,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    patchDocumentField,
    commitDocumentField,
    generateStripeAccount,
  }
}
