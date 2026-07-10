import * as React from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  buildAttachmentPayload,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { toIsoDateInputValue } from "@/lib/format-utils"
import { supabase } from "@/lib/supabase-client"

import { normalizeAttachmentValue, parseContributoNumericField } from "../lib"
import type { ContributoInpsBoardCardData } from "../types"

type UseContributiInpsDetailInput = {
  card: ContributoInpsBoardCardData | null
  onStageChange: (recordId: string, targetStageId: string) => Promise<void>
  onPatchCard: (
    recordId: string,
    patch: Partial<ContributoInpsBoardCardData["record"]>,
  ) => Promise<void>
}

export function useContributiInpsDetail({
  card,
  onStageChange,
  onPatchCard,
}: UseContributiInpsDetailInput) {
  const [stageValue, setStageValue] = React.useState("")
  const [isUploadingAttachment, setIsUploadingAttachment] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setStageValue(card?.stage ?? "")
    setUploadError(null)
    setIsUploadingAttachment(false)
  }, [card?.id, card?.stage])

  const form = useAutoSaveForm({
    defaults: {
      importo_contributi_inps: card?.record.importo_contributi_inps?.toString() ?? "",
      valore_pagopa: card?.record.valore_pagopa?.toString() ?? "",
      data_invio_famiglia: toIsoDateInputValue(card?.record.data_invio_famiglia),
    },
    onSave: async (patch) => {
      if (!card) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] =
          key === "data_invio_famiglia"
            ? (value as string) || null
            : parseContributoNumericField(value as string)
      }
      await onPatchCard(
        card.id,
        out as Partial<ContributoInpsBoardCardData["record"]>,
      )
    },
  })

  const handleStageValueChange = React.useCallback(
    async (nextValue: string) => {
      setStageValue(nextValue)
      if (!card || nextValue === card.stage) return
      await onStageChange(card.id, nextValue)
    },
    [card, onStageChange],
  )

  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const safeName = sanitizeFileName(file.name || "documento", "documento")
        const storagePath = ["contributi_inps", card.id, `${Date.now()}-${safeName}`].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)

        await onPatchCard(card.id, {
          allegato: [...normalizeAttachmentArray(card.record.allegato), payload],
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato contributo",
        )
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchCard],
  )

  const handleRemoveAttachment = React.useCallback(
    async (link: AttachmentLink) => {
      if (!card) return

      setUploadError(null)
      setIsUploadingAttachment(true)

      try {
        const nextValue = normalizeAttachmentArray(card.record.allegato).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        await onPatchCard(card.id, {
          allegato: nextValue.length > 0 ? nextValue : null,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
        )
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [card, onPatchCard],
  )

  return {
    form,
    stageValue,
    handleStageValueChange,
    isUploadingAttachment,
    uploadError,
    handleUploadAttachment,
    handleRemoveAttachment,
    normalizeAttachmentValue,
  }
}
