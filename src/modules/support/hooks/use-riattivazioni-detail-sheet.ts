import * as React from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { toIsoDateInputValue } from "@/lib/format-utils"
import { updateRecord } from "@/lib/record-crud"

import type { ChiusuraAttachmentSlot } from "../lib/riattivazioni-board.constants"
import {
  removeChiusuraAttachment,
  uploadChiusuraAttachment,
} from "../lib/riattivazioni-detail-persistence"
import type { RiattivazioneStageId, RiattivazioniBoardCardData } from "../types"

export type UseRiattivazioniDetailSheetParams = {
  card: RiattivazioniBoardCardData | null
  onStatusChange: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  onCardChange: (card: RiattivazioniBoardCardData) => void
}

export function useRiattivazioniDetailSheet({
  card,
  onStatusChange,
  onCardChange,
}: UseRiattivazioniDetailSheetParams) {
  const [updatingStatus, setUpdatingStatus] = React.useState(false)
  const [uploadingSlot, setUploadingSlot] = React.useState<ChiusuraAttachmentSlot | null>(null)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const latestCardRef = React.useRef<RiattivazioniBoardCardData | null>(card)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: RiattivazioniBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange],
  )

  const handleStatusChange = React.useCallback(
    async (nextValue: string) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || nextValue === currentCard.stage) return
      try {
        setUpdatingStatus(true)
        setDetailsError(null)
        await onStatusChange(currentCard.id, nextValue as RiattivazioneStageId)
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato riattivazione",
        )
      } finally {
        setUpdatingStatus(false)
      }
    },
    [card, onStatusChange],
  )

  const form = useAutoSaveForm({
    defaults: {
      data_per_riattivazione: toIsoDateInputValue(card?.record.data_per_riattivazione),
      sconto_proposto_riattivazione: card?.record.sconto_proposto_riattivazione ?? "",
    },
    onSave: async (patch) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] = (value as string) || null
      }
      setDetailsError(null)
      try {
        const response = await updateRecord("chiusure_contratti", currentCard.id, out)
        const baseCard = latestCardRef.current ?? currentCard
        const nextRecord = {
          ...baseCard.record,
          ...response.row,
        } as RiattivazioniBoardCardData["record"]
        applyCardChange({
          ...baseCard,
          record: nextRecord,
        })
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando riattivazione",
        )
      }
    },
  })

  const handleUploadAttachment = React.useCallback(
    async (slot: ChiusuraAttachmentSlot, file: File) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      setUploadingSlot(slot)
      setDetailsError(null)

      try {
        const response = await uploadChiusuraAttachment(
          currentCard.id,
          slot,
          file,
          currentCard.record[slot],
        )
        const baseCard = latestCardRef.current ?? currentCard
        const nextRecord = {
          ...baseCard.record,
          ...response.row,
        } as RiattivazioniBoardCardData["record"]

        applyCardChange({
          ...baseCard,
          record: nextRecord,
        })
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando allegato chiusura",
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [applyCardChange, card],
  )

  const handleRemoveAttachment = React.useCallback(
    async (slot: ChiusuraAttachmentSlot, link: AttachmentLink) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      setUploadingSlot(slot)
      setDetailsError(null)

      try {
        const response = await removeChiusuraAttachment(
          currentCard.id,
          slot,
          link,
          currentCard.record[slot],
        )
        const baseCard = latestCardRef.current ?? currentCard

        applyCardChange({
          ...baseCard,
          record: { ...baseCard.record, ...response.row } as RiattivazioniBoardCardData["record"],
        })
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [applyCardChange, card],
  )

  return {
    form,
    updatingStatus,
    uploadingSlot,
    detailsError,
    handleStatusChange,
    handleUploadAttachment,
    handleRemoveAttachment,
  }
}
