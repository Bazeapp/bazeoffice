import * as React from "react"

import {
  attachmentPathToPublicUrl,
  normalizeAttachmentArray,
} from "@/lib/attachments"
import type { LavoratoreListItem } from "../components/lavoratore-card"
import {
  DEFAULT_WORKER_AVATARS,
  shouldDisableWorkerImages,
  toPublicAssetUrl,
} from "../lib/base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

export type UseWorkerHeaderEditorParams = {
  selectedWorkerId: string | null
  selectedWorker: LavoratoreListItem | null
  selectedWorkerRow: LavoratoreRecord | null
}

/**
 * Header presentation state for worker detail views. Field editing and autosave
 * live in `WorkerProfileHeader` / gate form-context (FASE 5 BIS + QUATER).
 */
export function useWorkerHeaderEditor({
  selectedWorkerId,
  selectedWorker,
  selectedWorkerRow,
}: UseWorkerHeaderEditorParams) {
  const [isEditingHeader, setIsEditingHeader] = React.useState(false)
  const [selectedPresentationPhotoIndex, setSelectedPresentationPhotoIndex] = React.useState(0)

  const presentationPhotoSlots = React.useMemo(() => {
    const defaults = DEFAULT_WORKER_AVATARS.map((fileName) => toPublicAssetUrl(fileName))

    if (shouldDisableWorkerImages()) {
      return defaults
    }

    const uploadedPhotoUrls = normalizeAttachmentArray(selectedWorkerRow?.foto)
      .map((item) => attachmentPathToPublicUrl(item.path))
      .filter((value): value is string => Boolean(value))

    if (uploadedPhotoUrls.length > 0) {
      return uploadedPhotoUrls
    }

    if (selectedWorker?.immagineUrl) {
      return [
        selectedWorker.immagineUrl,
        ...defaults.filter((item) => item !== selectedWorker.immagineUrl),
      ]
    }
    return defaults
  }, [selectedWorker, selectedWorkerRow])

  React.useEffect(() => {
    setSelectedPresentationPhotoIndex(0)
    setIsEditingHeader(false)
  }, [selectedWorkerId])

  return {
    isEditingHeader,
    setIsEditingHeader,
    presentationPhotoSlots,
    selectedPresentationPhotoIndex,
    setSelectedPresentationPhotoIndex,
  }
}
