import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import type { FieldSelectOption } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { matchesSearchQuery } from "@/lib/search-utils"
import { updateRecord } from "@/lib/record-crud"
import { supabase } from "@/lib/supabase-client"
import {
  TIPO_LICENZIAMENTO_OPTIONS,
  type ChiusuraAttachmentSlot,
} from "../lib/chiusure-board-constants"
import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  ChiusureRapportoOption,
  TipoLicenziamentoOption,
} from "../types"

export type ChiusureDetailFormValues = {
  data_fine_rapporto: string
  tipo_licenziamento: string
  tipo_decesso: string
  presenze_ultimo_mese: string
  motivazione_cessazione_rapporto: string
  informazioni_aggiuntive: string
}

export type UseChiusureDetailSheetParams = {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: ChiusureRapportoOption[]
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: string) => Promise<void>
  onLinkRapporto: (chiusuraId: string, rapportoId: string | null) => Promise<void>
  onCardChange: (card: ChiusureBoardCardData) => void
  onPatchChiusura: (
    recordId: string,
    patch: Partial<ChiusureBoardCardData["record"]>,
  ) => Promise<void>
  onDeleteChiusura?: (recordId: string) => Promise<void>
}

export type ChiusureDetailSheetViewModel = {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleteChiusura?: (recordId: string) => Promise<void>
  updatingStatus: boolean
  handleStatusChange: (nextValue: string) => Promise<void>
  rapportoSearchQuery: string
  setRapportoSearchQuery: (value: string) => void
  filteredRapportoOptions: ChiusureRapportoOption[]
  linkingRapporto: boolean
  handleLinkRapporto: (rapportoId: string | null) => Promise<void>
  editingDetails: boolean
  toggleEditingDetails: () => void
  detailsError: string | null
  form: UseFormReturn<ChiusureDetailFormValues>
  tipoLicenziamentoSelectOptions: FieldSelectOption[]
  uploadingSlot: ChiusuraAttachmentSlot | null
  handleUploadAttachment: (slot: ChiusuraAttachmentSlot, file: File) => Promise<void>
  handleRemoveAttachment: (slot: ChiusuraAttachmentSlot, link: AttachmentLink) => Promise<void>
}

export function useChiusureDetailSheet({
  card,
  columns,
  rapportoOptions,
  tipoLicenziamentoOptions,
  open,
  onOpenChange,
  onStatusChange,
  onLinkRapporto,
  onCardChange,
  onPatchChiusura,
  onDeleteChiusura,
}: UseChiusureDetailSheetParams): ChiusureDetailSheetViewModel {
  const [updatingStatus, setUpdatingStatus] = React.useState(false)
  const [rapportoSearchQuery, setRapportoSearchQuery] = React.useState("")
  const [linkingRapporto, setLinkingRapporto] = React.useState(false)
  const [editingDetails, setEditingDetails] = React.useState(false)
  const [uploadingSlot, setUploadingSlot] = React.useState<ChiusuraAttachmentSlot | null>(null)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const previousCardIdRef = React.useRef<string | null>(card?.id ?? null)
  const latestCardRef = React.useRef<ChiusureBoardCardData | null>(card)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: ChiusureBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange],
  )

  React.useEffect(() => {
    setRapportoSearchQuery(card?.rapporto ? card.nomeCompleto : "")
    // Re-runs only when the identity changes (id/name/open), not on every
    // rapporto object reference change from board refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, card?.rapporto?.id, card?.nomeCompleto, open])

  const filteredRapportoOptions = React.useMemo(() => {
    const query = rapportoSearchQuery.trim()
    if (card?.rapporto && query === card.nomeCompleto.trim()) return []
    if (query.length < 2) return rapportoOptions.slice(0, 20)
    return rapportoOptions
      .filter((option) => matchesSearchQuery([option.label], query))
      .slice(0, 20)
    // Same intent as above — id-only dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportoOptions, rapportoSearchQuery, card?.rapporto?.id, card?.nomeCompleto])

  const handleLinkRapporto = React.useCallback(
    async (rapportoId: string | null) => {
      const currentCard = latestCardRef.current
      if (!currentCard) return
      const option = rapportoId
        ? rapportoOptions.find((item) => item.id === rapportoId) ?? null
        : null
      setLinkingRapporto(true)
      try {
        await onLinkRapporto(currentCard.id, rapportoId)
        const fallbackNome =
          [currentCard.record.nome, currentCard.record.cognome].filter(Boolean).join(" ").trim() ||
          "Nominativo non disponibile"
        applyCardChange({
          ...currentCard,
          rapporto: option?.rapporto ?? null,
          nomeCompleto: option ? option.label : fallbackNome,
        })
      } catch {
        // l'errore è gestito a livello di board
      } finally {
        setLinkingRapporto(false)
      }
    },
    [applyCardChange, onLinkRapporto, rapportoOptions],
  )

  React.useEffect(() => {
    const nextCardId = card?.id ?? null
    if (previousCardIdRef.current !== nextCardId) {
      previousCardIdRef.current = nextCardId
      setEditingDetails(false)
      setDetailsError(null)
    }
  }, [card?.id])

  async function handleStatusChange(nextValue: string) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard || nextValue === currentCard.stage) return
    try {
      setUpdatingStatus(true)
      await onStatusChange(currentCard.id, nextValue)
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleUploadAttachment(slot: ChiusuraAttachmentSlot, file: File) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    setUploadingSlot(slot)
    setDetailsError(null)

    try {
      const safeName = sanitizeFileName(file.name || "documento", "documento")
      const storagePath = [
        "chiusure_contratti",
        currentCard.id,
        slot,
        `${Date.now()}-${safeName}`,
      ].join("/")

      const uploadResult = await supabase.storage
        .from("baze-bucket")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadResult.error) {
        throw uploadResult.error
      }

      const payload = buildAttachmentPayload(file, storagePath)
      const baseCard = latestCardRef.current ?? currentCard
      const nextValue = [...normalizeAttachmentArray(baseCard.record[slot]), payload]
      const response = await updateRecord("chiusure_contratti", currentCard.id, {
        [slot]: nextValue,
      })
      const nextRecord = {
        ...baseCard.record,
        ...response.row,
      } as ChiusureBoardCardData["record"]

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
  }

  async function handleRemoveAttachment(slot: ChiusuraAttachmentSlot, link: AttachmentLink) {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    setUploadingSlot(slot)
    setDetailsError(null)

    try {
      const nextValue = normalizeAttachmentArray(currentCard.record[slot]).filter(
        (a) => !(link.path && a.path === link.path) && a.name !== link.label,
      )

      if (link.path?.startsWith("baze-bucket/")) {
        await supabase.storage
          .from("baze-bucket")
          .remove([link.path.replace(/^baze-bucket\//, "")])
      }

      const baseCard = latestCardRef.current ?? currentCard
      const response = await updateRecord("chiusure_contratti", currentCard.id, {
        [slot]: nextValue.length > 0 ? nextValue : null,
      })

      applyCardChange({
        ...baseCard,
        record: { ...baseCard.record, ...response.row } as ChiusureBoardCardData["record"],
      })
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  const form = useAutoSaveForm({
    defaults: {
      data_fine_rapporto: card?.record.data_fine_rapporto ?? "",
      tipo_licenziamento: card?.record.tipo_licenziamento ?? "",
      tipo_decesso: card?.record.tipo_decesso ?? "",
      presenze_ultimo_mese: card?.record.presenze_ultimo_mese ?? "",
      motivazione_cessazione_rapporto: card?.record.motivazione_cessazione_rapporto ?? "",
      informazioni_aggiuntive: card?.record.informazioni_aggiuntive ?? "",
    },
    onSave: async (patch) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return
      const out: Partial<ChiusureBoardCardData["record"]> = {}
      for (const [key, value] of Object.entries(patch)) {
        ;(out as Record<string, unknown>)[key] = (value as string) || null
      }
      if ("tipo_licenziamento" in patch) {
        applyCardChange({
          ...currentCard,
          record: {
            ...currentCard.record,
            tipo_licenziamento: (patch.tipo_licenziamento as string) || null,
          },
        })
      }
      await onPatchChiusura(currentCard.id, out)
    },
  })

  const tipoLicenziamentoSelectOptions = React.useMemo<FieldSelectOption[]>(() => {
    const options =
      tipoLicenziamentoOptions.length > 0
        ? tipoLicenziamentoOptions
        : TIPO_LICENZIAMENTO_OPTIONS.map((value) => ({ value, label: value }))
    const current = card?.record.tipo_licenziamento
    const withCurrent =
      current && !options.some((option) => option.value === current)
        ? [{ value: current, label: current }, ...options]
        : options
    return withCurrent.map((option) => ({ value: option.value, label: option.label }))
  }, [tipoLicenziamentoOptions, card?.record.tipo_licenziamento])

  const toggleEditingDetails = React.useCallback(() => {
    setEditingDetails((current) => !current)
  }, [])

  return {
    card,
    columns,
    open,
    onOpenChange,
    onDeleteChiusura,
    updatingStatus,
    handleStatusChange,
    rapportoSearchQuery,
    setRapportoSearchQuery,
    filteredRapportoOptions,
    linkingRapporto,
    handleLinkRapporto,
    editingDetails,
    toggleEditingDetails,
    detailsError,
    form,
    tipoLicenziamentoSelectOptions,
    uploadingSlot,
    handleUploadAttachment,
    handleRemoveAttachment,
  }
}
