import { FileTextIcon } from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"

import type { ChiusuraAttachmentSlot } from "../lib/riattivazioni-board.constants"
import type { RiattivazioniBoardCardData } from "../types"

export type RiattivazioniDetailAttachmentsSectionProps = {
  card: RiattivazioniBoardCardData
  uploadingSlot: ChiusuraAttachmentSlot | null
  onUpload: (slot: ChiusuraAttachmentSlot, file: File) => void
  onRemove: (slot: ChiusuraAttachmentSlot, link: AttachmentLink) => void
}

export function RiattivazioniDetailAttachmentsSection({
  card,
  uploadingSlot,
  onUpload,
  onRemove,
}: RiattivazioniDetailAttachmentsSectionProps) {
  return (
    <DetailSectionBlock
      title="Allegati chiusura"
      icon={<FileTextIcon className="size-4" />}
      contentClassName="space-y-4"
    >
      <AttachmentUploadSlot
        label="Lettera dimissioni / licenziamento"
        value={card.record.allegato_compilato ?? null}
        onAdd={(file) => onUpload("allegato_compilato", file)}
        onRemove={(link) => onRemove("allegato_compilato", link)}
        onPreviewOpen={() => {}}
        isUploading={uploadingSlot === "allegato_compilato"}
      />
      <AttachmentUploadSlot
        label="Documenti finali di chiusura"
        value={card.record.documenti_chiusura_rapporto ?? null}
        onAdd={(file) => onUpload("documenti_chiusura_rapporto", file)}
        onRemove={(link) => onRemove("documenti_chiusura_rapporto", link)}
        onPreviewOpen={() => {}}
        isUploading={uploadingSlot === "documenti_chiusura_rapporto"}
      />
    </DetailSectionBlock>
  )
}
