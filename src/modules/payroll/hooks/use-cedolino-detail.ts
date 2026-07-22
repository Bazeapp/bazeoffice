import * as React from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { runAutomationWebhook } from "@/lib/automation-webhook"
import { sanitizeFileName } from "@/lib/file-utils"
import { updateRecord } from "@/lib/record-crud"
import { supabase } from "@/lib/supabase-client"
import { toast } from "sonner"

import {
  buildCedolinoDetailDerived,
  buildCedolinoFormDefaults,
  buildPresenceFieldDefaults,
  splitCedolinoAutosavePatch,
} from "../lib"
import type { CedolinoDetailSheetProps, PagamentoAutomationId } from "../types"

type UseCedolinoDetailInput = Pick<
  CedolinoDetailSheetProps,
  "card" | "onPatchCard" | "onPatchPresence"
>

export function useCedolinoDetail({
  card,
  onPatchCard,
  onPatchPresence,
}: UseCedolinoDetailInput) {
  const derived = React.useMemo(() => buildCedolinoDetailDerived(card), [card])
  const presenceFieldDefaults = React.useMemo(
    () => buildPresenceFieldDefaults(derived.presenceRows),
    [derived.presenceRows],
  )
  const presenzeRecord = card?.presenze

  const form = useAutoSaveForm<Record<string, string>>({
    defaults: buildCedolinoFormDefaults(card, presenceFieldDefaults),
    onSave: async (patch) => {
      if (!card) return
      const { cardPatch, presencePatch } = splitCedolinoAutosavePatch(patch)

      if (Object.keys(cardPatch).length > 0) {
        await onPatchCard(card.id, cardPatch as Partial<typeof card.record>)
      }
      if (Object.keys(presencePatch).length > 0 && presenzeRecord) {
        await onPatchPresence(
          presenzeRecord.id,
          presencePatch as Partial<NonNullable<typeof card.presenze>>,
        )
      }
    },
  })

  const [runningAutomationId, setRunningAutomationId] =
    React.useState<PagamentoAutomationId | null>(null)
  const [uploadingCedolino, setUploadingCedolino] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [showCedolinoPreview, setShowCedolinoPreview] = React.useState(false)

  React.useEffect(() => {
    setShowCedolinoPreview(false)
  }, [card?.id])

  const handleRunPagamentoAutomation = React.useCallback(
    async (automationId: PagamentoAutomationId) => {
      const pagamento = derived.pagamento
      if (!pagamento?.id) {
        toast.error("Il pagamento non ha un id associato")
        return
      }

      setRunningAutomationId(automationId)
      try {
        await runAutomationWebhook(automationId, pagamento.id, {
          famiglia_id: pagamento.famiglia_id,
          ticket_id: pagamento.ticket_id,
        })
        toast.success(
          automationId === "finance-request-invoice-data"
            ? "Richiesta dati fatturazione inviata"
            : "Workflow fatturazione avviato",
        )
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Errore avvio automazione")
      } finally {
        setRunningAutomationId(null)
      }
    },
    [derived.pagamento],
  )

  const handleCopyMakeTransactionUrl = React.useCallback(async () => {
    if (!derived.makeTransactionUrl) {
      toast.error("Nessuna transazione collegata al cedolino")
      return
    }

    try {
      await navigator.clipboard.writeText(derived.makeTransactionUrl)
      toast.success("Link Make copiato")
    } catch {
      toast.error("Impossibile copiare il link Make")
    }
  }, [derived.makeTransactionUrl])

  const handleUploadCedolino = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadingCedolino(true)
      setUploadError(null)

      try {
        const safeName = sanitizeFileName(file.name || "cedolino", "cedolino")
        const storagePath = [
          "mesi_lavorati",
          card.id,
          "cedolino",
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        const nextCedolino = [...normalizeAttachmentArray(card.record.cedolino), payload]
        const response = await updateRecord("mesi_lavorati", card.id, {
          cedolino: nextCedolino,
        })

        onPatchCard(card.id, {
          cedolino: response.row.cedolino as typeof card.record.cedolino,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando cedolino",
        )
      } finally {
        setUploadingCedolino(false)
      }
    },
    [card, onPatchCard],
  )

  const handleRemoveCedolino = React.useCallback(
    async (link: AttachmentLink) => {
      if (!card) return

      setUploadingCedolino(true)
      setUploadError(null)

      try {
        const nextValue = normalizeAttachmentArray(card.record.cedolino).filter(
          (attachment) =>
            !(link.path && attachment.path === link.path) && attachment.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        const response = await updateRecord("mesi_lavorati", card.id, {
          cedolino: nextValue.length > 0 ? nextValue : null,
        })

        onPatchCard(card.id, {
          cedolino: response.row.cedolino as typeof card.record.cedolino,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo cedolino",
        )
      } finally {
        setUploadingCedolino(false)
      }
    },
    [card, onPatchCard],
  )

  const openAttachmentPreview = React.useCallback((link: AttachmentLink) => {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }, [])

  const toggleCedolinoPreview = React.useCallback(() => {
    setShowCedolinoPreview((current) => !current)
  }, [])

  return {
    derived,
    form,
    runningAutomationId,
    uploadingCedolino,
    uploadError,
    showCedolinoPreview,
    handleRunPagamentoAutomation,
    handleCopyMakeTransactionUrl,
    handleUploadCedolino,
    handleRemoveCedolino,
    openAttachmentPreview,
    toggleCedolinoPreview,
  }
}
