import * as React from "react"
import { toast } from "sonner"

import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { toIsoDateInputValue } from "@/lib/format-utils"
import { supabase } from "@/lib/supabase-client"
import type { RapportoLavorativoRecord } from "@/types"

import { PROVA_TEXTAREA_KEYS } from "../lib/prove-colloqui-view.constants"
import { buildDistributionItems } from "../lib/prove-colloqui-view.utils"
import type { ProvaCardData } from "../types"

type UseProveColloquiProvaSheetParams = {
  card: ProvaCardData | null
  patchRapporto: (
    rapportoId: string,
    patch: Partial<RapportoLavorativoRecord>,
  ) => Promise<RapportoLavorativoRecord>
}

export function useProveColloquiProvaSheet({
  card,
  patchRapporto,
}: UseProveColloquiProvaSheetParams) {
  const rapporto = card?.rapporto ?? null
  const distribution = buildDistributionItems(
    rapporto?.distribuzione_ore_settimana ?? null,
    rapporto?.ore_a_settimana ?? null,
  )
  const [uploadingSlot, setUploadingSlot] = React.useState<
    "registrazione_chiamate_lavoratori" | "registrazione_chiamate_famiglia" | null
  >(null)
  const [recordingError, setRecordingError] = React.useState<string | null>(null)
  const rapportoRef = React.useRef(rapporto)

  React.useEffect(() => {
    rapportoRef.current = rapporto
  }, [rapporto])

  const form = useAutoSaveForm({
    defaults: {
      prova_stato_cs: rapporto?.prova_stato_cs ?? null,
      prova_priorita_famiglia: rapporto?.prova_priorita_famiglia ?? "",
      prova_feedback_famiglia: rapporto?.prova_feedback_famiglia ?? null,
      prova_feedback_lavoratore: rapporto?.prova_feedback_lavoratore ?? null,
      prova_ramo_d2: rapporto?.prova_ramo_d2 ?? null,
      prova_note_cs_lavoratore: rapporto?.prova_note_cs_lavoratore ?? "",
      prova_note_cs_famiglia: rapporto?.prova_note_cs_famiglia ?? "",
      prova_data_checkin: toIsoDateInputValue(rapporto?.prova_data_checkin),
    } as Record<string, unknown>,
    onSave: async (patch) => {
      if (!rapporto) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (PROVA_TEXTAREA_KEYS.has(key)) {
          out[key] = (value as string)?.trim() || null
        } else if (key === "prova_data_checkin") {
          out[key] = (value as string) || null
        } else {
          out[key] = (value as string | null) ?? null
        }
      }
      try {
        await patchRapporto(rapporto.id, out as Partial<RapportoLavorativoRecord>)
      } catch (caughtError) {
        toast.error(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando prova",
        )
      }
    },
  })

  async function handleUploadRecording(
    slot: "registrazione_chiamate_lavoratori" | "registrazione_chiamate_famiglia",
    file: File,
  ) {
    const currentRapporto = rapportoRef.current
    if (!currentRapporto) return
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|opus|aac)$/i.test(file.name)) {
      setRecordingError(
        "Formato non supportato. Carica file audio mp3, m4a, wav, ogg, opus o aac.",
      )
      return
    }

    setRecordingError(null)
    setUploadingSlot(slot)

    try {
      const safeName = sanitizeFileName(file.name || "documento", "documento")
      const storagePath = [
        "rapporti_lavorativi",
        currentRapporto.id,
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
      const updated = await patchRapporto(currentRapporto.id, {
        [slot]: [...normalizeAttachmentArray(currentRapporto[slot]), payload],
      } as Partial<RapportoLavorativoRecord>)
      rapportoRef.current = { ...currentRapporto, ...updated }
      toast.success("Registrazione caricata")
    } catch (caughtError) {
      setRecordingError(
        caughtError instanceof Error ? caughtError.message : "Errore caricando registrazione",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  async function handleRemoveRecording(
    slot: "registrazione_chiamate_lavoratori" | "registrazione_chiamate_famiglia",
    link: AttachmentLink,
  ) {
    const currentRapporto = rapportoRef.current
    if (!currentRapporto) return
    if (!window.confirm(`Rimuovere la registrazione "${link.label}"?`)) return

    setRecordingError(null)
    setUploadingSlot(slot)

    try {
      const nextValue = normalizeAttachmentArray(currentRapporto[slot]).filter((attachment) => {
        if (link.path && attachment.path === link.path) return false
        return attachment.name !== link.label
      })

      if (link.path?.startsWith("baze-bucket/")) {
        const removeResult = await supabase.storage
          .from("baze-bucket")
          .remove([link.path.replace(/^baze-bucket\//, "")])

        if (removeResult.error) {
          throw removeResult.error
        }
      }

      const updated = await patchRapporto(currentRapporto.id, {
        [slot]: nextValue.length > 0 ? nextValue : null,
      } as Partial<RapportoLavorativoRecord>)
      rapportoRef.current = { ...currentRapporto, ...updated }
      toast.success("Registrazione rimossa")
    } catch (caughtError) {
      setRecordingError(
        caughtError instanceof Error ? caughtError.message : "Errore rimuovendo registrazione",
      )
    } finally {
      setUploadingSlot(null)
    }
  }

  return {
    form,
    distribution,
    uploadingSlot,
    recordingError,
    handleUploadRecording,
    handleRemoveRecording,
  }
}
