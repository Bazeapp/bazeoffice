import * as React from "react"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { toIsoDateInputValue } from "@/lib/format-utils"
import { updateRecord } from "@/lib/record-crud"
import { supabase } from "@/lib/supabase-client"
import {
  VARIAZIONE_DETAILS_KEYS,
  VARIAZIONE_NUMERIC_RAPPORTO_KEYS,
  type VariazioneAttachmentSlot,
} from "../lib/variazioni-detail-constants"
import { formatVariazioneBoardDate } from "../lib/variazioni-board-constants"
import type { VariazioniBoardCardData } from "../types"

export type UseVariazioniDetailSheetParams = {
  card: VariazioniBoardCardData | null
  open: boolean
  onCardChange: (card: VariazioniBoardCardData) => void
  onOpenChange: (open: boolean) => void
}

export function useVariazioniDetailSheet({
  card,
  open,
  onCardChange,
  onOpenChange,
}: UseVariazioniDetailSheetParams) {
  const [editingDetails, setEditingDetails] = React.useState(false)
  const [editingRapporto, setEditingRapporto] = React.useState(false)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const [rapportoError, setRapportoError] = React.useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = React.useState<VariazioneAttachmentSlot | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const previousCardIdRef = React.useRef<string | null>(card?.id ?? null)
  const latestCardRef = React.useRef<VariazioniBoardCardData | null>(card)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: VariazioniBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange],
  )

  React.useEffect(() => {
    const nextCardId = card?.id ?? null
    const isDifferentCard = previousCardIdRef.current !== nextCardId
    previousCardIdRef.current = nextCardId

    if (isDifferentCard) {
      setEditingDetails(false)
      setEditingRapporto(false)
      setDetailsError(null)
      setRapportoError(null)
      setUploadError(null)
    }
  }, [card?.id])

  const saveDetailsPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setDetailsError(null)

      try {
        const response = await updateRecord("variazioni_contrattuali", currentCard.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextRecord = {
          ...baseCard.record,
          ...response.row,
        } as VariazioniBoardCardData["record"]

        applyCardChange({
          ...baseCard,
          record: nextRecord,
          dataVariazione: formatVariazioneBoardDate(nextRecord.data_variazione),
          variazioneDaApplicare: nextRecord.variazione_da_applicare,
        })
      } catch (caughtError) {
        setDetailsError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando variazione",
        )
        throw caughtError
      }
    },
    [applyCardChange, card],
  )

  const saveRapportoPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.rapporto?.id || Object.keys(patch).length === 0) return

      setRapportoError(null)

      try {
        const response = await updateRecord("rapporti_lavorativi", currentCard.rapporto.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const baseRapporto = baseCard.rapporto ?? currentCard.rapporto
        applyCardChange({
          ...baseCard,
          rapporto: {
            ...baseRapporto,
            ...response.row,
          } as VariazioniBoardCardData["rapporto"],
        })
      } catch (caughtError) {
        setRapportoError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando rapporto",
        )
        throw caughtError
      }
    },
    [applyCardChange, card],
  )

  const form = useAutoSaveForm({
    defaults: {
      data_variazione: toIsoDateInputValue(card?.record.data_variazione),
      variazione_da_applicare: card?.record.variazione_da_applicare ?? "",
      paga_oraria_lorda:
        card?.rapporto?.paga_oraria_lorda != null
          ? String(card.rapporto.paga_oraria_lorda)
          : "",
      ore_a_settimana:
        card?.rapporto?.ore_a_settimana != null
          ? String(card.rapporto.ore_a_settimana)
          : "",
      tipo_rapporto: card?.rapporto?.tipo_rapporto ?? "",
      tipo_contratto: card?.rapporto?.tipo_contratto ?? "",
      distribuzione_ore_settimana: card?.rapporto?.distribuzione_ore_settimana ?? "",
    },
    onSave: async (patch) => {
      if (!card) return
      const detailsPatch: Record<string, unknown> = {}
      const rapportoPatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (VARIAZIONE_DETAILS_KEYS.has(key)) {
          detailsPatch[key] = (value as string) || null
        } else if (VARIAZIONE_NUMERIC_RAPPORTO_KEYS.has(key)) {
          rapportoPatch[key] = value ? Number(value as string) : null
        } else {
          rapportoPatch[key] = (value as string) || null
        }
      }
      if (Object.keys(detailsPatch).length > 0) await saveDetailsPatch(detailsPatch)
      if (Object.keys(rapportoPatch).length > 0) await saveRapportoPatch(rapportoPatch)
    },
  })

  const handleUploadAttachment = React.useCallback(
    async (slot: VariazioneAttachmentSlot, file: File) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      setUploadingSlot(slot)
      setUploadError(null)

      try {
        const safeName = sanitizeFileName(file.name || "documento", "documento")
        const storagePath = [
          "variazioni_contrattuali",
          currentCard.id,
          slot,
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
        const baseCard = latestCardRef.current ?? currentCard
        const response = await updateRecord("variazioni_contrattuali", currentCard.id, {
          [slot]: [...normalizeAttachmentArray(baseCard.record[slot]), payload],
        })
        const nextRecord = {
          ...baseCard.record,
          ...response.row,
        } as VariazioniBoardCardData["record"]

        applyCardChange({
          ...baseCard,
          record: nextRecord,
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento",
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [applyCardChange, card],
  )

  const handleRemoveAttachment = React.useCallback(
    async (slot: VariazioneAttachmentSlot, link: AttachmentLink) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      setUploadingSlot(slot)
      setUploadError(null)

      try {
        const nextValue = normalizeAttachmentArray(currentCard.record[slot]).filter(
          (attachment) =>
            !(link.path && attachment.path === link.path) && attachment.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        const baseCard = latestCardRef.current ?? currentCard
        const response = await updateRecord("variazioni_contrattuali", currentCard.id, {
          [slot]: nextValue.length > 0 ? nextValue : null,
        })

        applyCardChange({
          ...baseCard,
          record: { ...baseCard.record, ...response.row } as VariazioniBoardCardData["record"],
        })
      } catch (caughtError) {
        setUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
        )
      } finally {
        setUploadingSlot(null)
      }
    },
    [applyCardChange, card],
  )

  const openAttachmentPreview = React.useCallback((link: AttachmentLink) => {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }, [])

  const handleLavoratoreChange = React.useCallback(
    (nextLavoratore: Record<string, unknown>) => {
      const baseCard = latestCardRef.current ?? card
      if (!baseCard) return
      applyCardChange({
        ...baseCard,
        lavoratore: nextLavoratore,
      })
    },
    [applyCardChange, card],
  )

  const handleFamigliaChange = React.useCallback(
    (nextFamiglia: Record<string, unknown>) => {
      const baseCard = latestCardRef.current ?? card
      if (!baseCard) return
      applyCardChange({
        ...baseCard,
        famiglia: nextFamiglia,
      })
    },
    [applyCardChange, card],
  )

  return {
    card,
    open,
    onOpenChange,
    form,
    editingDetails,
    setEditingDetails,
    editingRapporto,
    setEditingRapporto,
    detailsError,
    rapportoError,
    uploadingSlot,
    uploadError,
    handleUploadAttachment,
    handleRemoveAttachment,
    openAttachmentPreview,
    handleLavoratoreChange,
    handleFamigliaChange,
    formatVariazioneBoardDate,
  }
}

export type VariazioniDetailSheetViewModel = ReturnType<typeof useVariazioniDetailSheet>
